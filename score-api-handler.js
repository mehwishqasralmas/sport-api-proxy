module.exports = function (proxyRes, req, res) {
    let sportScoreIndx = req.url.indexOf('/api/v1/sportscore');
    let sportScorematchIndx = req.url.indexOf('/data/match');
  
    if( sportScoreIndx == -1)
      return;

    console.log("SPORT SCORE HANDLER");

    let body = [];
    let reqBody = req.body ? JSON.parse(Buffer.concat(req.body).toString()) : {};
    
    proxyRes.on("data", data => body.push(data));
        
    res.writeHead(200, { 'Content-Type': 'application/json' });

    proxyRes.on('end', () => { 
      if(sportScorematchIndx > -1 && !reqBody.slug && !reqBody.date)
        res.end(JSON.stringify({
          status: 1,
          message: "Process data success",
          data: getMatchList(reqBody)
        }));
      else 
        res.end(Buffer.concat(body).toString());
    });
  };


  function getMatchList({leagues, teams}) {
    let chkLeagues = Array.isArray(leagues) && leagues.length;
    let chkTeams = Array.isArray(teams) && teams.length;

    let data = require('./resources/data/sport-score-matches.json');

    for(day in data) {
      let matches = data[day];
      matches = matches.filter(match => {
        let valid = true;
        if (!match.matches.length)
          return false;

        if(chkLeagues)
          valid &= leagues.includes(match.league_slug);
        if(chkTeams) {
          let innerMatches = [];
          match.matches.forEach(innerMatch => {
            if(teams.includes(innerMatch.home_team) || teams.includes(innerMatch.away_team))
              innerMatches.push(innerMatch)
          });
          match.matches = innerMatches;
          valid &= innerMatches.length > 0;
        }
        return valid;
      });
      
     data[day] = matches;
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
  
    require('fs').writeFileSync("./resources/data/sport-score-leagues.json", JSON.stringify(leagues));
  }

  async function syncMatches() {
    let axios = require('axios');
    let matches = {};
    let daysOffset = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
    let now = Date.now();

    for(offset of daysOffset) {
      let date = new Date(now + (offset * 24 * 60 * 60 * 1000));
      let day = `${date.getFullYear()}-` 
      day += `0${date.getMonth() + 1}`.slice(-2);
      day += '-' + `0${date.getDate()}`.slice(-2);

      await axios.post("https://app.8com.cloud/api/v1/sportscore/data/match.php", {
        "lang":"en",
        "date": day,
        "sport":"football",
        "timezone":"+08:00"
      }).then(res => {
        matches[day] = [...res.data.data];
      }).catch(err => console.log(err));
    }
    require('fs').writeFileSync("./resources/data/sport-score-matches.json", JSON.stringify(matches));
  }

