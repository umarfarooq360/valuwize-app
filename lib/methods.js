Meteor.methods({
    //Searches the DB to find possibles companies in same subsector and industry
  getPossibles: function(ticker, sector, subindustry, mc){
          var similars = []; 
          similars.push(ticker);
          //Find in DB by sector and industry and MC
          
          var possibles = Companies.find(
            {Ticker: {$ne: ticker},
             Sector: sector, 
             SubIndustry: subindustry,
             MC:{$lt: 1.8*mc, $gt: 0.2*mc } }).fetch();
          //console.log("possibles:" + possibles);
          //Changed MC in find to fix range bug

          for(i in possibles){
            possibles[i].selected = true;
            similars.push(possibles[i].Ticker);
          }
          return similars;
  },
  removeCompany: function(list, company){
    var removeIndex = list.map(function(item) { return item.symbol; })
                       .indexOf(company);

    removeIndex > -1 && array.splice(removeIndex, 1);
    return list;
  },/*This function generates dates in format DD/MM/YY given a start and n years back*/
  generateDates: function(start, n){
    //var dates = [];
    //dates.push(start);
    //for(i in n){

    //}
    return ["4/14/2016",
            "4/14/2015",
            "4/14/2014",
            "4/14/2013",
            "4/14/2012",
            "4/14/2011",
            "4/14/2010",
            "4/14/2009",
            "4/14/2008",
            "4/14/2007",
            "4/14/2006"];
  }    


});