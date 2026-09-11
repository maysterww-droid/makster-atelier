import pdfMake from 'pdfmake/build/pdfmake.js';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';

pdfMake.addVirtualFileSystem(pdfFonts);

const buffer = await pdfMake.createPdf({
  defaultStyle: { font: 'Roboto' },
  content: [
    { text: 'Makster Quote 0.1.4', bold: true, fontSize: 18 },
    'Проверка PDF · Cenová nabídka · Angebot · Oferta',
    'Русский: шкаф, фасад, кромка, монтаж.',
    'Čeština: cenová nabídka, montáž, záloha.',
    'Polski: oferta, montaż, zaliczka.',
  ],
}).getBuffer();

const bytes = Buffer.from(buffer);
if (bytes.length < 1500) throw new Error(`PDF smoke output is unexpectedly small: ${bytes.length}`);
if (bytes.subarray(0, 4).toString('ascii') !== '%PDF') throw new Error('PDF signature is missing');
console.log(`PDF smoke OK: ${bytes.length} bytes`);
