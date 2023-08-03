 
module.exports = function (proxyRes, req, res) {  
  if(!req.adsIndx)
    return;

  console.log("SPORT ADS HANDLER");

  let body = [];
    
  proxyRes.on("data", data => body.push(data));

  res.writeHead(200, { 'Content-Type': 'application/json' });
  console.log("CHK_");
  proxyRes.on('end', async () => { 
    body = body.length ? JSON.parse(Buffer.concat(body).toString()) : {};
    console.log(body);
    newBody = {ads: [
     { img: "", url: "https://sm.pcmag.com/pcmag_au/review/a/apple-ios-/apple-ios-13_gerx.png" },
     { img: "", url: "https://sm.pcmag.com/pcmag_au/review/a/apple-ios-/apple-ios-13_gerx.png" },
     { img: "", url: "https://sm.pcmag.com/pcmag_au/review/a/apple-ios-/apple-ios-13_gerx.png" }
    ]};
    if(Array.isArray(body.mapping) && body.mapping.length) {
      newBody.ads = [];
      body.mapping.forEach(ad => newBody.ads.push({img: "", url: ad.redirect_url}));
    }
    res.end(JSON.stringify(newBody));
  });
};