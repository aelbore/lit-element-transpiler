#!/bin/bash

yarn --cwd ./packages/rollup-plugin-inline-lit-element link.loader &&
yarn --cwd ./packages/rollup-plugin-inline-lit-element "$1" &&

yarn --cwd ./packages/inline-lit-element-loader link.loader &&
yarn --cwd ./packages/inline-lit-element-loader "$1" &&

yarn --cwd ./packages/rollup-plugin-inline-lit-element serve &
yarn --cwd ./packages/inline-lit-element-loader serve