"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */
const axios = require("axios");

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

    console.log(await getGameInfo(products[0].slug));
  },
};
