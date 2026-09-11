import { copyFileSync } from 'fs';
import { join } from 'path';

const distDirectory = join(import.meta.dirname, '..', 'dist');
const HTMLIndexPath = join(distDirectory, 'index.html');
const HTML404Path = join(distDirectory, 'index.html');

copyFileSync(HTMLIndexPath, HTML404Path);
