import { render } from '../dist/server/entry.server.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  try {
    const templatePath = path.join(__dirname, '../dist/client/index.html');
    const template = fs.readFileSync(templatePath, 'utf-8');
    
    const ssrManifestPath = path.join(__dirname, '../dist/client/.vite/ssr-manifest.json');
    const ssrManifest = fs.existsSync(ssrManifestPath) 
      ? fs.readFileSync(ssrManifestPath, 'utf-8') 
      : undefined;

    const { appHtml, dehydratedState, helmetContext } = await render(
      { req, res },
      ssrManifest
    );

    const stringifiedState = JSON.stringify(dehydratedState);
    const helmetHtml = Object.values(helmetContext.helmet || {})
      .map((value) => value.toString() || "")
      .join(" ");

    const envVariablesHtml = `<script>window.hievents = ${JSON.stringify({
      VITE_API_URL_SERVER: process.env.VITE_API_URL_SERVER,
      VITE_API_URL_CLIENT: process.env.VITE_API_URL_CLIENT
    })};</script>`;

    const html = template
      .replace("<!--app-html-->", appHtml)
      .replace("<!--dehydrated-state-->", `<script>window.__REHYDRATED_STATE__ = ${stringifiedState}</script>`)
      .replace("<!--environment-variables-->", envVariablesHtml)
      .replace(/<!--render-helmet-->.*?<!--\/render-helmet-->/s, helmetHtml);

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } catch (error) {
    console.error('SSR Error:', error);
    res.status(500).send("Internal Server Error");
  }
}
