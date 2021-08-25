"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
const axios = require("axios");
const slugify = require("slugify");

async function checkByNameOnEntity(name, entity) {
  const row = await strapi.services[entity].find({ name });
  return !!row.length;
}

async function create(name, entity) {
  const exists = await checkByNameOnEntity(name, entity);
  if (exists) return;

  await strapi.services[entity].create({
    name,
    slug: slugify(name, { lower: true }),
  });
}

async function getGameInfo(slug) {
  const jsdom = require("jsdom");
  const { JSDOM } = jsdom;

  const body = await axios.get(`https://www.gog.com/game/${slug}`);
  const dom = new JSDOM(body.data);
  const { document } = dom.window;

  const description = document.querySelector(".description");

  return {
    rating: "BR0",
    short_description: description.textContent.slice(0, 160),
    description: description.innerHTML,
  };
}

const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&page=1&sort=popularity`;

module.exports = {
  populate: async (params) => {
    const {
      data: { products },
    } = await axios.get(gogApiUrl);

    const [, product] = products;

    await create(product.publisher, "publisher");
  },
};
