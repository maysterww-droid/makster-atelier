import {mkdirSync,readFileSync,writeFileSync,copyFileSync}from'node:fs';
const root=new URL('./',import.meta.url),source=new URL('../apps/web-demo/public/',root);
mkdirSync(new URL('public/',root),{recursive:true});
for(const name of ['app.js','smm.js','styles.css'])copyFileSync(new URL(name,source),new URL('public/'+name,root));
let html=readFileSync(new URL('index.html',source),'utf8').replace('<body>','<body class="owner-qa-https">').replace('MAKSTER Office 6.0 · Owner QA','MAKSTER Office 6.0.1 · Owner QA');
html=html.replace('</head>','<link rel="stylesheet" href="/owner-qa.css" /></head>');
writeFileSync(new URL('public/index.html',root),html);
copyFileSync(new URL('owner-qa.css',root),new URL('public/owner-qa.css',root));
console.log('Original Office UI packaged. No private snapshot, credentials or legacy API included.');
