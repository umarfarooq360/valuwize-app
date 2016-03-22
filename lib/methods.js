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
             MC:{$lt: 1.8*mc},
             MC:{$gt: 0.2*mc} }).fetch();
          //console.log("possibles:" + possibles);
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
  }    


});
