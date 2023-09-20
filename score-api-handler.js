  let syncMatchesRunning = false;
  
  module.exports = function (proxyRes, req, res) {
    let sportScoreIndx = req.url.indexOf('/api/v1/sportscore');
    let sportScorematchIndx = req.url.indexOf('/data/match');
  
    if( sportScoreIndx == -1)
      return;

    console.log("SPORT SCORE HANDLER");

    let body = [];
    let reqBody = {}; 
    try {
      reqBody = req.body ? JSON.parse(Buffer.concat(req.body).toString()) : {};
    } catch(err) {};
    
    proxyRes.on("data", data => body.push(data));
        
    res.writeHead(200, { 'Content-Type': 'application/json' });

    proxyRes.on('end', async () => { 
      if(sportScorematchIndx > -1 && !reqBody.slug && !reqBody.date)
        res.end(JSON.stringify({
          status: 1,
          message: "Process data success",
          data: await getMatchList(reqBody)
        }));
      else 
        res.end(Buffer.concat(body).toString());
    });
  };


  async function getMatchList({leagues, teams, lang, specificDay}) {
    let chkLeagues = Array.isArray(leagues);
    let chkTeams = Array.isArray(teams) && teams.length;
    lang = lang || "en";
    let data = [];
    
    if(specificDay)
      data = await syncMatches(lang, specificDay);
    
    else {
      syncMatches(lang);
      data = JSON.parse(require('fs').readFileSync(`${__dirname}/resources/data/sport-score-matches-${lang}.json`));
    }

    for(day in data) {
      let matches = data[day].leagues;
      matches = matches.filter(match => {
        if (!match.matches.length)
          return false;

        if(chkLeagues && (!leagues.length || leagues.includes(match.league_slug.trim()))) {
          return true;
        }

        if(chkTeams) {
          let innerMatches = [];
          match.matches.forEach(innerMatch => {
            if(teams.includes(innerMatch.home_team) || teams.includes(innerMatch.away_team))
              innerMatches.push(innerMatch)
          });
          match.matches = innerMatches;
          if(innerMatches.length > 0)
            return true;
        }

        if(chkLeagues || chkTeams)
          return false;

        return true;
      });
      
     data[day].leagues = matches;
    }
    
    return data;
  }


  async function syncAllLeagues() {
    let axios = require('axios');
    let leagues = [];
    let lastPage = 1;
    let totalPages = 2;

    for(lastPage; lastPage <= totalPages; ++lastPage)
      await axios.post("https://app.8com.cloud/api/v1/sportscore/data/league.php", {
        "lang": "zh",
        "page": lastPage
      }).then(res => {
        leagues.push(...res.data.data);
        totalPages = Math.ceil(+res.data.total / +res.data.per_page);
        console.log(lastPage + " out of " + totalPages);
      }).catch(err => console.log(err));
  
    require('fs').writeFileSync(`${__dirname}/resources/data/sport-score-leagues.json`, JSON.stringify(leagues));
  }

  async function syncMatches(lang, specificDay) {
    let axios = require('axios');
    let fs = require('fs');
    let matches = [];
    let daysOffset = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
    let now = Date.now();
    lang = lang || "en";

    if(syncMatchesRunning || (!specificDay && !checkNeedMatchesUpdate(lang))) {
      return;
    }

    syncMatchesRunning = true;

    for(offset of daysOffset) {
      let date = new Date(now + (offset * 24 * 60 * 60 * 1000));
      let day = `${date.getFullYear()}-` 
      day += `0${date.getMonth() + 1}`.slice(-2);
      day += '-' + `0${date.getDate()}`.slice(-2);
      day = specificDay ? specificDay : day;

      await axios.post("https://app.8com.cloud/api/v1/sportscore/data/match.php", {
        "lang": lang,
        "date": day,
        "sport":"football",
        "timezone":"+04:00"
      }).then(res => {
        matches.push({day, leagues: res.data.data});
      }).catch(err => console.log(err));

      if(specificDay) {
        syncMatchesRunning = false;
        return matches;
      }
    }

    syncMatchesRunning = false;
    fs.writeFileSync(`${__dirname}/resources/data/sport-score-matches-${lang}.json`, JSON.stringify(matches));
    
    refreshMatchUpdateInfo(lang);
  }

  function checkNeedMatchesUpdate(lang) {
    let fs = require('fs');
    let updateInfo = fs.readFileSync(`${__dirname}/resources/data/update-matches-info.json`);

    if(updateInfo) {
      try { 
        updateInfo = JSON.parse(updateInfo); 
      } catch(err) {}
      

      if(updateInfo[lang] && updateInfo[lang].lastUpdateDate) {
        lastUpdateDate = new Date(updateInfo[lang].lastUpdateDate);
        if(lastUpdateDate.getMonth() == new Date().getMonth() && 
          lastUpdateDate.getDate() == new Date().getDate()) {
            return false;
        }
      }
    }

    return true;
  }

  function refreshMatchUpdateInfo(lang) {
    let fs = require('fs');
    let path = `${__dirname}/resources/data/update-matches-info.json`;
    let updateInfo = fs.readFileSync(path, 'utf8');
    lang = lang || "en";

    if(updateInfo) {
      try { 
        updateInfo = JSON.parse(updateInfo); 
      } catch(err) {console.log(err)}
    } else {
      updateInfo = {
        "en": {lastUpdateDate: ""},
        "zh": {lastUpdateDate: ""}
      };
    }

    updateInfo[lang].lastUpdateDate = new Date().toUTCString();
    fs.writeFileSync(path, JSON.stringify(updateInfo));
  }