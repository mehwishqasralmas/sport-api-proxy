const crypto = require("crypto");
const secretKey = Buffer.from('QASR_AlMAAS_SOFTWARE_DEVELOPMENT', 'utf-8');
const iv = Buffer.from('QASR_ALMAAS_SOFT', 'utf-8');

module.exports = {

  encrypt(str) {
    const cipher = crypto.createCipheriv("aes-256-cbc", secretKey, iv);
    let encryptedText = cipher.update(str, "utf-8", "base64");
    encryptedText += cipher.final("base64");
    return encryptedText;
  },
  decrypt(str) {
    const decipher = crypto.createDecipheriv("aes-256-cbc", secretKey, iv);
    let decryptedText = decipher.update(str, "base64", "utf-8");
    decryptedText += decipher.final("utf-8");
    return decryptedText; 
  }
}
