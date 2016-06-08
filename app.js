var express = require('express');
/* tempalte engine*/
var exphbs = require('express-handlebars');
/* third parts middleware */
var bodyParser = require('body-parser');
var session = require('express-session');
var redis = require('redis');
var redisStore = require('connect-redis')(session);

var userdb = require('./lib/userdb.js');
var funct = require('./lib/funct.js');

/* port.js
 *
 * module.exports.port = [port number]
 */
var port = require('./port.js').port;

var app = express();
var redisClient = redis.createClient();

/******************************************
 * store init value in locals             *
 *                                        *
 * app.locals.store for record shop info  *
 * and presenting in web site             *
 ******************************************/

/* setting hbs */
/* layoutsDir and partialsDir is default setting*/
app.engine('.hbs', exphbs({
													defaultLayout:	'main',
													extname: 				'.hbs',
													layoutsDir:			'views/layouts/',
													partialsDir:		'views/partials/',
													}));

app.set('view engine', '.hbs');

/* true: if cache exists, it won't recompile           
 * false: compiles everytime, and won't store in cache 
 *
 * for development, disenable is good, but for efficiency
 * , you shold enable cache
 */
//app.set('view cache', true);

app.set('port', process.env.PORT || port);

app.use(session({
  secret: 'helloworld something terroble and oh no',
  store: new redisStore({
    client: redisClient,
    ttl: 30*24*60*60
  }),
  saveUninitialized: false,
  resave: false
}));

function sessExist(req, res, next) {
  if(typeof req.session.user === 'undefined') {
    res.redirect(303, '/login_page');
  } else {
    next();
  }
};

app.use( express.static( __dirname + '/public' ) );
app.use( bodyParser.urlencoded({ extended: false }));

/* login restful api */
app.post('/login',function(req, res) {
  var login = req.body;
  /* if havn't loged in */

  data = userdb.GetAccountCheck({
    account: login.account,
    password: login.password
  });
  console.log('login post api testing for myGetAccountCheck');
  console.log(data);
  if ( typeof data !== 'undefined' ) {
    req.session.user = data;
    res.redirect(303,'/bookhome');
    // else, login faill, redirect to /login_page
  } else {
    res.redirect(303,'back');
  }

  /*, function(error, data) {
    console.log('login post api testing for myGetAccountCheck');
    console.log(data);
    // if login success, redirect to /user  
    if ( typeof data !== 'undefined' ) {
      req.session.user = data;
      res.redirect(303,'/bookhome');
    // else, login faill, redirect to /login_page  
    } else {
      res.redirect(303,'back');
    }  
  });
  */
});

app.post('/test/login', function(req, res) {
  var login = req.body;
  /* if havn't loged in */

  data = userdb.GetAccountCheck({
    account: login.account,
    password: login.password
  });
  console.log('login post api testing for myGetAccountCheck');
  console.log(data);
  if ( typeof data !== 'undefined' ) {
    req.session.user = data;
    res.status(200).send({succLogin: true, redirectUrl: '/bookhome'});
    // else, login faill, redirect to /login_page
  } else {
    res.status(200).send({succLogin: false, redirectUrl: '/login_page'});
  }
});
app.post('/forget', function(req, res) {
  console.log(req.body);
  var account = req.body.account;
  console.log(account);
  userdb.GetDataBase('account',req.body,['email','password'],
    function(err,reply){
      if(typeof reply !== 'undefined'){
        console.log('!!!!!!!');
        console.log(reply);
        //send-email
        funct.SendMail(account,reply[0][0],reply[1][0]);
        res.status(200).send({
          redirectUrl:'/login_page'
        });
      }
      else{
        console.log('The account does not exist!.');
        res.status(200).send({
          redirectUrl:'/forget'
        });
      }
    }
  );
});
app.post('/logout', function(req, res) {
  if (req.session.user) {
    req.session.destroy(function(){

      res.status(200).send({
        redirectUrl: '/login_page'
      });

    });
  } else {
    res.status(200).send({
      redirectUrl: '/login_page'
    });
  }
});

app.post('/register', function(req, res) {

  console.log('register post api req.body');
  console.log(req.body);
  var account_info = {account: req.body.account}

  /* call google sheet api for checking account exist in db or not*/
  reply = userdb.GetRegisterCheck(account_info);
  if(typeof reply === 'undefined') {
    userdb.AddSheetData('account', req.body);
    res.status(200).send({
      accountDup: false,
      redirectUrl: '/login_page'
    });
  }
  else {
    console.log(reply+' is used,please register again ');
    res.status(200).send({
      accountDup: true,
      redirectUrl: '/register'
    });
  }
    /*function(error,reply){
    console.log('register check');

    if (error) {
      console.log('google sheet error');
      res.status(200).send({
        accountDup: true,
        redirectUrl: '/register'
      });
    }

     // if new account doesn't exist in db
     // insert new account info to db
    if(typeof reply === 'undefined') {
      userdb.AddSheetData('account', req.body);
      res.status(200).send({
        accountDup: false,
        redirectUrl: '/login_page'
      });

     //if account name has existed, return error for client
     //fail to insert new data
    } else {
      console.log(reply+' is used,please register again ');
      res.status(200).send({
        accountDup: true,
        redirectUrl: '/register'
      });
    }
  });*/
});

app.post('/book', function(req, res) {
  var _input = {
    time: (new Date()).toString(),
    username: req.session.user.account || 'error',
    shop: req.body.shop,
    reserv_time: req.body.reserv_time
  };
  
  userdb.AddSheetData('reservation', _input);
  res.status(200).send({
    redirectUrl: '/bookhome'
  });
});

app.post('/render/booktime', function(req, res) {
  console.log('render booktime');
  var shop_id = req.body.shop_id;

  userdb.GetDataBase('shop_info',{
    ShopName: shop_id
    },['bookTime'],function(error,data){
      res.status(200).send(data[0]);
    }
  );
});

app.post('/selectStore', function(req, res) {
  console.log(req.body);
  req.session.shop = req.body;
  console.log(req.session.shop);
  res.status(200).send({
    redirectUrl: '/venderhome'
  });
});

app.get('/selectStore',function(req,res){
  res.render('select_store');
});

app.get('/test/selectStore', function(req, res) {
  res.render('select_store2');
});

app.get('/', function(req, res) {
	res.render('home');
});

app.get('/suithome', function(req, res) {
  res.render('suithome', {
    venderSel: false,
    suitSel: true,
    bookSel: false
  });
});

app.get('/suitinfo', function(req, res) {
  res.render('suitinfo', {
    venderSel: false,
    suitSel: true,
    bookSel: false
  });
});

app.get('/venderhome', function(req, res) {
  res.render('venderhome', {
    venderSel: true,
    suitSel: false,
    bookSel: false
  });
});

app.get('/venderhistory', function(req, res) {
  var result = [];
  var shop = {ShopName:'大帥西服'};
  if(typeof req.session.shop !== 'undefined') {
    shop = req.session.shop
  }
  userdb.GetDataBase('shop_info', shop,
    ['History'],function(error,data){
        if(typeof data !== 'undefined'){
          for(i = 0; i < data[0].length; i++)
            result.push({paragraph:data[0][i]});
          res.render('venderhistory', {
            venderSel: true,
            suitSel: false,
            bookSel: false,
            shop_name: shop.ShopName,
            story: result
          });
        }
        else
          console.log('error!!!');
      }
  );
});
app.get('/shop_contact', function(req, res) {
  var shop = {ShopName:'大帥西服'};
  if(typeof req.session.shop !== 'undefined') {
    shop = req.session.shop
  }
  userdb.GetDataBase('shop_info', shop,
    ['ShopName','OpenTime','Telphone','Address'],function(error,data){
        if(typeof data != 'undefined'){
          res.render('shop_contact', {
            venderSel: true,
            suitSel: false,
            bookSel: false,
            name:data[0][0],
            time:data[1][0],
            telphone:data[2][0],
            address:data[3][0]
          });
        }
        else
          console.log('error!!!');
      }
  );
});

app.get('/cloth', function(req, res) {
  var result = [];
  var shop = {ShopName:'大帥西服'};
  if(typeof req.session.shop !== 'undefined') {
    shop = req.session.shop;
  }
  console.log(shop);
  userdb.GetDataBase('shop_info', shop,['cloth'],function(error,data){
        if(typeof data !== 'undefined')
        {
          for(i = 0; i < data[0].length; i++)
            result.push({imagine:data[0][i],index:(i+1).toString()});
          res.render('cloth', {
              venderSel: true,
              suitSel: false,
              bookSel: false,
              clothList: result
          });
        }
        else
          console.log('error!!!');
    }
  );
});

app.get('/feedback', function(req, res) {
  var result = [];
  var shop = {ShopName:'大帥西服'};
  if(typeof req.session.shop !== 'undefined') {
    shop = req.session.shop
  }
  userdb.GetDataBase('feedback', shop,
  ['UserName','Time','Message','Evaluation'],function(error,data){
      if(typeof data !== 'undefined')  {
        for(i = 0; i < data[0].length; i++)
        {
          //console.log('feedback: '+data);
          result.push({
            author:data[0][i],
            time:data[1][i],
            message:data[2][i],
            star:data[3][i]
          });
        }
        res.render('custom_feedback', {
          venderSel: true,
          suitSel: false,
          bookSel: false,
          comment: result
        });
      }
      else
        console.log('error!!!');
    }
  );
});

app.get('/suithome', function(req, res) {
  res.render('suithome', {
    venderSel: false,
    suitSel: true,
    bookSel: false
  });
});

app.get('/suitinfo', function(req, res) {
  res.render('suitinfo', {
    venderSel: false,
    suitSel: true,
    bookSel: false
  });
});

app.get('/suithistory', function(req, res) {
  res.render('suithistory', {
    venderSel: false,
    suitSel: true,
    bookSel: false
  });
});

app.get('/login_page', function(req, res) {
  if (typeof req.session.user !== 'undefined') {
    res.redirect(303,'/bookhome');
  } else{
    res.render('login_page', {
      venderSel: false,
      suitSel: false,
      bookSel: true
    });
  }
});

app.get('/register', function(req, res) {
  if (typeof req.session.user !== 'undefined') {
    res.redirect(303,'/bookhome');
  } else {
    res.render('register');
  }
});

app.get('/forget', function(req, res) {
  res.render('forget');
});

app.get('/regmodify', function(req, res) {
  res.render('regModify');
});

app.get('/bookhome', sessExist, function(req, res) {

  userdb.GetDataBase(
    'shop_info',
    'ALL',
    ['ShopName'],
    function(error, data){
      console.log('data');
      console.log(data[0]);
      res.render('bookhome', {
        venderSel: false,
        suitSel: false,
        bookSel: true,
        shopList: data[0],
        user: {
          name: req.session.user.nickname,
          phone: req.session.user.cellphone
        }
      });
    }
  );
});

/* middleware */
/* 404 - Not Found  */
app.use(function(req, res, next){
	res.status(404);
	res.render('404');
});


/* middleware */
/* 500 server error  */
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});


app.listen(app.get('port'), function(){
	console.log( 'Express started on http://localhost:' +
		app.get('port') + '; press Ctrl-C to terminate.' );
});
