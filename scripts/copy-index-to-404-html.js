import { copyFileSync } from 'fs';
import { join } from 'path';

const distDirectory = join(import.meta.dirname, '..', 'dist');
const HTMLIndexPath = join(distDirectory, 'index.html');
const HTML404Path = join(distDirectory, '404.html');

copyFileSync(HTMLIndexPath, HTML404Path);
