import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPng = path.join(__dirname, 'build', 'icon.png');
const outputIco = path.join(__dirname, 'build', 'icon.ico');
const publicIco = path.join(__dirname, 'public', 'icon.ico');

pngToIco(inputPng)
  .then(buf => {
    fs.writeFileSync(outputIco, buf);
    fs.writeFileSync(publicIco, buf);
    console.log('Multi-resolution ICO created successfully at:', outputIco);
  })
  .catch(err => {
    console.error('Error creating ICO:', err);
  });

