const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target || (target !== 'postgresql' && target !== 'sqlserver')) {
  console.error('Usage: node switch-db.js [postgresql|sqlserver]');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('schema.prisma not found at ' + schemaPath);
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, 'utf8');

// Replace provider inside datasource block and native database type decorators
if (target === 'postgresql') {
  content = content.replace(/(datasource\s+\w+\s+\{[\s\S]*?provider\s*=\s*")[^"]+(")/, '$1postgresql$2');
  content = content.replace(/@db\.NVarChar\(Max\)/gi, '@db.Text');
} else if (target === 'sqlserver') {
  content = content.replace(/(datasource\s+\w+\s+\{[\s\S]*?provider\s*=\s*")[^"]+(")/, '$1sqlserver$2');
  content = content.replace(/@db\.Text/gi, '@db.NVarChar(Max)');
}

fs.writeFileSync(schemaPath, content, 'utf8');
console.log(`Successfully switched Prisma provider to: ${target} and updated type decorators.`);
