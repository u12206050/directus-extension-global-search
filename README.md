# Global Search Module

![How it works GIF](https://github.com/u12206050/directus-extension-global-search/blob/main/GlobalSearchModule.gif)

A module for searching across multiple collections at once and returning results to allow you to navigate directly to the item page.

## Install

 - Copy the `global-search` folder into `your_directus_project/extensions/modules/`
 - Enable the module under Project Settings in the Directus Admin Panel.

## Setup (in admin panel)

 - Navigate to the Global Search module and in the side-bar select a collection you wish to search.
 - Fill in the display template: This is how search results will be displayed back to you.
 - Choose the fields that you want to search. The fewer the better.


### Development

Update the `"directus:extension"."path"` value in `package.json` with the relative path to your Directus Project if you don't want to copy it across everytime.

 - `npm install`
 - `npm run dev`

### Build

 - `npm run build`


## Author and Support

Created by Gerard Lamusse (u12206050)

If this is helps you in anyway please support me with what you think it is worth via [PayPal.me](https://paypal.me/GerardLamusse)
