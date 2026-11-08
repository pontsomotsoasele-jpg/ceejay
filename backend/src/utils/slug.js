const crypto = require('crypto');

function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return `${slug || 'story'}-${crypto.randomBytes(3).toString('hex')}`;
}

module.exports = slugify;
