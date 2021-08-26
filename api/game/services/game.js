"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
const axios = require("axios");
const slugify = require("slugify");
const qs = require("querystring");

function Exception(e) {
  return { e, data: e.data && e.data.errors && e.data.errors };
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getByName(name, entity) {
  const row = await strapi.services[entity].find({ name });
  return row.length ? row[0] : null;
}

async function create(name, entity) {
  const exists = await getByName(name, entity);
  if (exists) return;

  await strapi.services[entity].create({
    name,
    slug: slugify(name, { lower: true }),
  });
}

async function createGames(products) {
  await Promise.all(
    products.map(async (product) => {
      const item = await getByName(product.title, "game");

      if (!item) {
        console.info(`Creating: ${product.title}...`);

        const game = await strapi.services.game.create({
          name: product.title,
          slug: product.slug.replace(/_/g, "-"),
          price: product.price.amount,
          release_date: new Date(
            Number(product.globalReleaseDate) * 1000
          ).toISOString(),
          categories: await Promise.all(
            product.genres.map((name) => getByName(name, "category"))
          ),
          platforms: await Promise.all(
            product.supportedOperatingSystems.map((name) =>
              getByName(name, "platform")
            )
          ),
          developers: [await getByName(product.developer, "developer")],
          publisher: await getByName(product.publisher, "publisher"),
          ...(await getGameInfo(product.slug)),
        });

        await setImage({ image: product.image, game });
        await Promise.all(
          product.gallery
            .slice(0, 5)
            .map((url) => setImage({ image: url, game, field: "gallery" }))
        );

        await timeout(2000);

        return game;
      }
    })
  );
}

async function createManyToManyData(products) {
  const categories = {};
  const developers = {};
  const platforms = {};
  const publishers = {};

  products.forEach((product) => {
    const { developer, genres, publisher, supportedOperatingSystems } = product;

    developers[developer] = true;
    publishers[publisher] = true;

    genres && genres.forEach((each) => (categories[each] = true));

    supportedOperatingSystems &&
      supportedOperatingSystems.forEach((each) => (platforms[each] = true));
  });

  return Promise.all([
    ...Object.keys(categories).map((name) => create(name, "category")),
    ...Object.keys(developers).map((name) => create(name, "developer")),
    ...Object.keys(platforms).map((name) => create(name, "platform")),
    ...Object.keys(publishers).map((name) => create(name, "publisher")),
  ]);
}

async function getGameInfo(slug) {
  try {
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;

    const body = await axios.get(`https://www.gog.com/game/${slug}`);
    const dom = new JSDOM(body.data);
    const { document } = dom.window;

    const ratingElement = dom.window.document.querySelector(
      ".age-restrictions__icon use"
    );

    const description = document.querySelector(".description");

    return {
      rating: ratingElement
        ? ratingElement
            .getAttribute("xlink:href")
            .replace(/_/g, "")
            .replace(/[^\w-]+/g, "")
        : "BR0",
      short_description: description.textContent.trim().slice(0, 160),
      description: description.innerHTML,
    };
  } catch (e) {
    console.log("getGameInfo", Exception(e));
  }
}

async function setImage({ image, game, field = "cover" }) {
  try {
    const url = `https:${image}_bg_crop_1680x655.jpg`;
    const { data } = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(data, "base64");

    const FormData = require("form-data");
    const formData = new FormData();

    formData.append("refId", game.id);
    formData.append("ref", "game");
    formData.append("field", field);
    formData.append("files", buffer, { filename: `${game.slug}.jpg` });

    console.info(`Uploading ${field} image: ${game.slug}.jpg`);

    await axios({
      method: "POST",
      url: `http://${strapi.config.host}:${strapi.config.port}/upload`,
      data: formData,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
      },
    });
  } catch (e) {
    console.log("setImage", Exception(e));
  }
}

module.exports = {
  populate: async (params) => {
    try {
      const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&${qs.stringify(
        params
      )}`;

      const {
        data: { products },
      } = await axios.get(gogApiUrl);

      await createManyToManyData(products);
      await createGames(products);
    } catch (e) {
      console.log("populate", Exception(e));
    }
  },
};
