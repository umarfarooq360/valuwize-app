//Company db for data on companies, sectors and subindustries
Companies = new Mongo.Collection("compsdata");//change to lowercase for deploy

/*
 Data fields that need to be fetched from Yahoo finance
 http://www.jarloo.com/yahoo_finance/
 Fields stand for: PreviosClose, MarketCap, MoreInfo, Name, Symbol, 
  Earnings per share, pricetoSales, pricetoBook, P/E
*/
var FIELDS = ['p', 'j1', 'v', 'n', 's', 'e', 'p5', 'p6', 'r',
            'e7','e8', 'j4', 'r6', 'r7', ];

var FROM = '2006-01-01';
var TO = '2016-04-01';            
var PERIOD = 'm';

/*Some global variables for RN analysis*/
var BENCHMARK_DATE = "4/14/2016";//date for ratio normalization
var NUM_YEARS_BACK = 10;
var BENCHMARK_TICKER = "RIY Index";//russell 1000
var CURRENT_DATE_INDEX = 0; //dates go back in time

if (Meteor.isClient) {
 
  //Default symbol value 
  Session.setDefault('symbol', '');
  Session.setDefault('averages', ["peRatio","pricePerBook","pricePerSales"]);
  Session.setDefault('allAverages', ['peRatio','pricePerBook','pricePerSales']);
  Session.setDefault('RNratios', ['PE','PS','PB',"PCF"]);
  Session.setDefault('RNRatiosToUse', ['PE','PS','PB',"PCF"]);
  

  
    

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
      
      //console.log(Companies.find({},{}).fetch());
      var ourCompany = Companies.findOne({Ticker: text});
      console.log(ourCompany);
      
      if(ourCompany){ //if company is in DB
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
            //response[0].selected = true;
            Session.set('comparablesData', response);
           
          });
           
        });
      }else{  //show error
          Materialize.toast("Could not find Ticker!", 5000);
      }  
      // Clear form
      event.target.text.value = "";
    },
    'click .toggleAverage':function(){
     
     var ourAvg = event.target.id; 
     // Get value from form element
      console.log("removed: "+event.target.id);
      
      var avgs = Session.get('averages');
      var index = avgs.indexOf(ourAvg);
      if(index !== -1){ //remove the average
        avgs.splice(index, 1);
      }else{ //add the average
        avgs.push(ourAvg);
      }
      console.log(avgs);
      Session.set('averages', avgs);//update session var
      
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
              if(!err){
                var newlist = Session.get('comparablesData');
                newlist.push(response[0]);
                Session.set('comparablesData', newlist);
            }
           });
    }
  });

  Template.valuationResults.helpers({
    'getFinalNumber':function(){
          //variables/ratios used for averages
          var averages = Session.get('averages');
          
          //data for current stock
          var stockData = Session.get('symbolData');
          
          var sum = 0;
          
          for(var k in averages){
            //get the appropriate avg value
            var tmpAverage = Session.get(averages[k]+'Isp');
            
            //multiply avg by stock's ratio and sum
            if(tmpAverage !==  null ){
              sum+= tmpAverage;
            }
          }

          Session.set('predValuation', rnd(sum/averages.length));
          return rnd(sum/averages.length);
      }, 
      'getAvgTypes':function(){
        return Session.get('allAverages');
      },
      'getSelectedAvgs':function(){
        return Session.get('averages');
      },
      'getCurrentPrice':function(){
        return Session.get('symbolData').previousClose;
      },
      'getUpside':function(){
        var price = Session.get('symbolData').previousClose;
        var pred = Session.get('predValuation');
        var ups = ((pred-price)/price) *100;

        return rnd(ups); 
      },
      'getUpsideCol':function(){
        return (Session.get('symbolData').previousClose < Session.get('predValuation'));
      }
  });    

  //Helper methods that return session variables
  Template.average.helpers({
      //finds sum of all companies in comparablesData by field param
      'getMean': function() {
        //the field for which we take avg e.g. peRatio
         var field = this.valueOf();
         var averages = Session.get('averages');
         
         var index = averages.indexOf(field);

         
         if(index < 0){
          //console.log("DNE: "+this);
          return 0;
         }
         var list = Session.get('comparablesData');
         var n = list.length;
         
         
         
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

  Template.perShareValues.helpers({ 
      'getPerShareValue': function() {
        var field = this.valueOf();
        var averages = Session.get('averages');
         if(averages.indexOf(field) === -1){
          return 0;
         }
        //variables/ratios used for averages
        //data for current stock
        var stockData = Session.get('symbolData');
        
        //console.log("psv:"+this + stockData);
          
        var tmpAverage = stockData[this];
        var sharePrice = stockData.previousClose;

        //Store as session var
        Session.set(this+'Psv',sharePrice/tmpAverage);

        return rnd(sharePrice/tmpAverage);


      }

  });

   Template.impliedSharePrice.helpers({ 
      'getImpliedSharePrice': function() {
        var averages = Session.get('averages');
         if(averages.indexOf(this.valueOf()) === -1){
          return 0;
         }
        //variables/ratios used for averages
        //console.log("isp:"+ this );
        var tmpAverage = Session.get(this+'Avg');
        var perShareVal = Session.get(this+'Psv');

        //Store as session var
        Session.set(this+'Isp',perShareVal*tmpAverage);
        return rnd(perShareVal*tmpAverage);
      }

  });


  /*
  -------------------------------------------------------------
  Templates for ratio notmalization begin here
  -------------------------------------------------------------
  
  */
  Template.rationorm.events({
    
    //This event in triggered when we submit new stock
    "submit .new-norm": function (event) {
      
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get value from form element
      var text = event.target.text.value;
      console.log("norm:"+text);
      
      /*Get data for the stock to value*/
      Meteor.call('getHistoricalData',text, function (err, possibles) {
        //console.log( possibles);
        Session.set('symbolN', text);
        console.log("len:"+possibles.length); 
         
        // Generate dates to go the required number of years back
        Meteor.call('generateDates', BENCHMARK_DATE, NUM_YEARS_BACK, function (err,res) {
            Session.set("ratioDates", res);
            Session.set("recentDate", res[CURRENT_DATE_INDEX]);
            var stockData = [];
            var benchmarkData = [];
            //splitting the data in two
            for(i in possibles){
              if(possibles[i]["Ticker"]=== BENCHMARK_TICKER){
                benchmarkData.push(possibles[i]);
              }else{
                stockData.push(possibles[i]);
              }
            }
            
            possibles = null;//to save memory
            //Use DB to get historical data for RIY Index or any benchmark
            console.log("bcn:"+benchmarkData.length+" \n");console.log( benchmarkData[1]);
            console.log("stk: "+stockData.length+"\n");console.log( stockData[0]);
              
            //filter data to only get particular dates
            var ratios = Session.get("RNratios");
            for(i in ratios){
              //store the data
              console.log( stockData[i]);
              console.log(benchmarkData[i]);
              //changed to not use DelField 
              Session.set("dataRN"+ratios[i], stockData[i] );
              
              //stockData[i]=null;//saving memory
              //console.log("filt\n");console.log(filteredData);
              Session.set("dataRNBen"+ratios[i], benchmarkData[i] );
              
              console.log("var set:");
              console.log(Session.get("dataRNBen"+ratios[i]));
              //Session.set("benchMarkRecent"+ratios[i], filteredData[res[CURRENT_DATE_INDEX]]);
    
            }



             //This is the company we are valuing
            //not saving to save memory
            Session.set('symbolDataN', stockData);
            Session.set('displayNow', true);
            
            Meteor.call('getName', [text], function (err, stockCurrentData){
              console.log("yahoo data:");
              console.log(stockCurrentData[0].previousClose);
              Session.set('stockLastClose', stockCurrentData[0].previousClose); 
            });

           
          });


      }); 
      // Clear form
      event.target.text.value = "";
    },
    'click .toggleAverage':function(){
     
     var ourAvg = event.target.id; 
     // Get value from form element
      
      var avgs = Session.get('RNRatiosToUse');
      var index = avgs.indexOf(ourAvg);
      if(index !== -1){ //remove the average
        avgs.splice(index, 1);
        console.log("removed: "+event.target.id);
      }else{ //add the average
        avgs.push(ourAvg);
      }

      Session.set('RNRatiosToUse', avgs);//update session var
      
    }

  });

  /*ratio normalization helper methods*/
  Template.rationorm.helpers({
    'symbolN': function(){
      return Session.get("symbolN");
    },
    'symbolDataN': function(){
      return Session.get("symbolDataN");
    },
    'getDates': function(){
      return Session.get('ratioDates');
    },/*Dummy method helps pass param to #each*/
    'benchParam': function(){
      return _.extend({type:"Ben"}, {'val':this});
    },
    'checkBenchData':function(){
      var tmp =Session.get("dataRNBenPE"); 
      console.log("checking: ");console.log(tmp);
      return tmp;//checking cash flow since last
    },'displayNow':function(){
      return Session.get("displayNow");
    }


  });

  Template.eachDate.helpers({
    /*Returns the dates  selected*/
    'getValue':function(){
      //console.log(this);
      if(this.type){
        return this.val.valueOf();
      }
      return this;
    }, /*Returns the value of the ratio given by ID*/
    'getRatio':function(id){
      //console.log(tmp);

      if(this.type === "Ben"){
        
        var tmp = Session.get("dataRNBen"+id);
             
        return tmp[this.val.valueOf()];
      }else{
        var tmp = Session.get("dataRN"+id);
        return tmp[this];  
      }
      
    }

  });

  Template.averageRN.helpers({
    getAverage: function(id){
      /*returns the average for some ratio given by id*/
      var tmp, storeName;
      //console.log("this in avg: ");console.log(this);
      if(this.type){
        tmp = Session.get("dataRNBen"+id);
        storeName = "averageRNBen"+id;

      }else{
        tmp = Session.get("dataRN"+id);
        storeName = "averageRN"+id;
      }
      var keys = Session.get("ratioDates");
      //console.log("keys\n"+keys);
      var sum=0; var n=0;
      for(i in keys){ //iterate and add and sore and return average
        if(tmp[keys[i]] !== "#N/A N/A"){
          sum+= tmp[keys[i]];
          n++;
        }
      }
      var result = rnd(sum/n);
      Session.set(storeName, result);
      return result;
    }

  });

  Template.valuationResultsRN.helpers({
    getRatio: function(id){
      /*returns the ratio of stock avg divided by benchmark avg*/
      
      var benchmarkAvg = Session.get("averageRNBen"+id);
      var stockAvg = Session.get("averageRN"+id);

      var result = rnd(stockAvg/benchmarkAvg);
      
      Session.set("SBAvgRatio"+id, result);
      return result;
    },
    getBenchmarkCurrent: function(id){
      return Session.get("dataRNBen"+id)[Session.get("recentDate")];
    },
    getImpliedMultiple: function(id){
      var multiple =  (Session.get("dataRNBen"+id)[Session.get("recentDate")])*
          Session.get("SBAvgRatio"+id);
      Session.set("StockMultiple"+id, multiple);
      return rnd(multiple);    
    },
    getPerShareValue : function(id){
       var pshValues = Session.get("stockLastClose")/(Session.get("dataRN"+id)[Session.get("recentDate")]);
       Session.set("psvRN"+id, pshValues);
       return rnd(pshValues);
    },
    getImpliedPrice:function(id){
       var price = Session.get("psvRN"+id)*Session.get("StockMultiple"+id);
       Session.set("impliedPrice"+id, price);
       return rnd(price);
    },
    getAveragePrice: function(){
      var ratios = Session.get("RNratios");
      var ratiosToUse = Session.get("RNRatiosToUse");
      var sum = 0;
      for( i in ratiosToUse){
        sum+= Session.get("impliedPrice"+ ratiosToUse[i]);
      }
      var predPrice = sum/ratiosToUse.length;
      Session.set("predPriceRN", predPrice);
      return rnd(predPrice); 
    },getCurrentPrice : function(){
      return Session.get("stockLastClose");
    },
    getUpside:function(){
      return rnd((Session.get("predPriceRN")-
        Session.get("stockLastClose"))*100/Session.get("stockLastClose"));
    }, getUpsideCol :function(){
       return (Session.get('stockLastClose') < Session.get('predPriceRN'));
    }

  });



  /*
    -----------------------------------------------------------------------
    Login/Signup Templates code
    -----------------------------------------------------------------------
  */
  Template.register.events({
      'submit .register-form': function(event){
          event.preventDefault();
          var email = event.target.email.value;
          var password = event.target.password.value;
          console.log("account created: "+email);
          Accounts.createUser({
              email: email,
              password: password,
              name: email
          },function(err){
            if(!err) {
                Router.go('/');
            }else{
              console.log(err);
            }
          });
          
      }
  });

  Template.login.events({
    'submit .login-form': function (event) {
        event.preventDefault();
        var email = event.target.email.value;
        var password = event.target.password.value;
        console.log("signing in: "+email);
        Meteor.loginWithPassword(email,password,function(err){
            if(!err) {
                Router.go('/');
            }else{
              console.log(err);
            }
        });
    }
});




  
} //client code ends here

/*
  Server side Code goes here!
*/


if (Meteor.isServer) {
  Meteor.startup(function () {
    RNData = new Mongo.Collection("trailinghistoricalnew"); //database with data on hist ratios


    //Meteor server methods go here
    Meteor.methods({
      getName: function(symbol){
          console.log("server did something!");
          var data = YahooFinance.snapshot({
            symbols: symbol,
            fields: FIELDS
          });
          
          return data;
        },
        /*Uses the DB to fetch data of symbol and benchamrk */
        getHistoricalData: function(symbol){
          var data = RNData.find({Ticker: {$in  : [symbol, BENCHMARK_TICKER]}}).fetch();
          
          return data;
        }
        
      });



  });

}

/*

Routes are given below. 

*/

Router.route('/', function () {
  this.render('home');
});

Router.route('/comps', function () {
  this.render('comparable');
});

Router.route('/rationorm', function () {
  this.render('rationorm');
});

Router.route('/logout', function () {
  Meteor.logout();
  this.render('home');
});

Router.route('/login', function () {
  this.render('login');
});

Router.route('/register', function () {
  this.render('register');
});

/*Rounds numbers for easier to look results*/
function rnd(num){
  return Math.round(num * 1000) / 1000;
}

/*Return object with only the fields specified by fields*/
function delFields(obj, fields){
  console.log("del called with:"+ obj);
  var newObj ={};
  for(i in fields){
    newObj[fields[i]] = obj[fields[i]];
  }
  return newObj;
}

