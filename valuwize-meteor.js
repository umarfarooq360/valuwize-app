//Company db for data on companies, sectors and subindustries
Companies = new Mongo.Collection("Companies");

/*
 Data fields that need to be fetched from Yahoo finance
 http://www.jarloo.com/yahoo_finance/
 Fields stand for: PreviosClose, MarketCap, MoreInfo, Name, Symbol, 
  Earnings per share, pricetoSales, pricetoBook, P/E
*/
var FIELDS = ['p', 'j1', 'v', 'n', 's', 'e', 'p5', 'p6', 'r',
            'e7','e8', 'j4', 'r6', 'r7', ];

if (Meteor.isClient) {
 
  //Default symbol value 
  Session.setDefault('symbol', '');
  Session.setDefault('averages', ["peRatio","pricePerBook","pricePerSales"]);
  
    

  //Helper methods that return session variables
  Template.comparable.helpers({
    'symbol': function () {
      return Session.get('symbol');
    },
    'symbolData': function(){
       return Session.get('symbolData') || "";
      },
     'comparablesData':function(){
      return Session.get('comparablesData') || "";
     } 
        
  });

  
  Template.comparable.events({
    
    //This event in triggered when we submit new stock
    "submit .new-stock": function (event) {
      
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get value from form element
      var text = event.target.text.value;
      console.log(text);
      
      
      var ourCompany = Companies.findOne({Ticker: text});
      console.log(ourCompany);
      Meteor.call('getPossibles',ourCompany.Ticker,
         ourCompany.Sector, ourCompany.SubIndustry,
          ourCompany.MC, function(err, possibles) {
       

        console.log(possibles);
        Meteor.call('getName',possibles, function(err, response) {
          Session.set('symbol', text);
          console.log(response);
         
         //This is the company we are valuing
          Session.set('symbolData', response[0]);

          //These are all the rest, first item removed
          response.splice(0,1);
          Session.set('comparablesData', response);
         
        });
         
      });
      
      
      

      // Clear form
      event.target.text.value = "";
    }
  });

  Template.possibleCompany.events({
    "click .delete": function () {
      // Set the checked property to the opposite of its current value
      this.selected = ! this.selected;
      
      //removes from the list
      var list = Session.get('comparablesData');

      var removeIndex = list.map(function(item) { 
        return item.symbol; }).indexOf(this.symbol);
      //remove at the index and update session variable  
      removeIndex > -1 && list.splice(removeIndex, 1);
      Session.set('comparablesData', list);

    }
  
  });

  Template.valuationResults.events({
    'submit .add-comp':function(){
          // Prevent default browser form submit
          event.preventDefault();
     
          // Get value from form element
          var text = event.target.stock.value;
          console.log("adding: "+text);
          //call getName and pull data and update session var
          Meteor.call('getName',[text], function(err, response) {
              var newlist = Session.get('comparablesData');
              newlist.push(response[0]);
              Session.set('comparablesData', newlist);
           });
    }
  });

  Template.valuationResults.helpers({
    'getFinalNumber':function(){
          //variables/ratios used for averages
          var averages = Session.get('averages');
          //data for current stock
          var stockData = Session.get('symbolData');
          
          console.log("avgs:"+averages+ stockData);
          var sum = 0;
          
          for(var k in averages){
            //get the appropriate avg value
            var tmpAverage = Session.get(averages[k]+'Avg');
            
            //multiply avg by stock's ratio and sum
            if(tmpAverage !==  null ){
              sum+= tmpAverage*stockData[averages[k]];
            }
          }

          return rnd(sum/averages.length);
      }, 
      'getAvgTypes':function(){
        return Session.get('averages');
      },
      'getCurrentPrice':function(){
        return Session.get('symbolData').previousClose;
      }
  });    

  //Helper methods that return session variables
  Template.average.helpers({
      //finds sum of all companies in comparablesData by field param
      'getMean': function() {
         
         var list = Session.get('comparablesData');
         var n = list.length;
         
         //the field for which we take avg e.g. peRatio
         var field = this;
         
         //incase nothing is in the list
         if( n<1){return 0;}
         
         //sum up by field and get average
         var sum = 0;
         for(var i = 0; i<n ; i++){
           sum+= list[i][field]; 
         }
         //set the appropritae session variable and return
         Session.set(this+'Avg',sum/n);
         return rnd(sum/n);
      }

      
      
  }); 

  
}

if (Meteor.isServer) {
  Meteor.startup(function () {

    //Meteor server methods go here
    Meteor.methods({
      getName: function(symbol){
          console.log("server did something!");
          var data = YahooFinance.snapshot({
            symbols: symbol,
            fields: FIELDS
          });
          
          return data;
        }
      });



  });

}

Router.route('/', function () {
  this.render('comparable');
});

/*Rounds numbers for easier to look results*/
function rnd(num){
  return Math.round(num * 1000) / 1000;
}