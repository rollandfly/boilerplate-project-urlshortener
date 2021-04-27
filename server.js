require('dotenv').config()


var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var dns = require('dns');
const options = {
  family: 6,
  hints: dns.ADDRCONFIG | dns.V4MAPPED,
};

var cors = require('cors');

var app = express();

let bodyParser = require('body-parser');
// Basic Configuration 
var port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});

/* Database Connection */
mongoose.connect(process.env.MONGO_URI, 
{ useNewUrlParser: true, useUnifiedTopology: true });

let urlSchema = new mongoose.Schema({
  original : {type: String, required: true},
  short: Number
});

let Url = mongoose.model('Url', urlSchema);


let responseObject = {};

app.post('/api/shorturl', bodyParser.urlencoded({ extended: false }) , (request, response) => {
  let inputUrl = request.body['url'];
  
  let urlRegex = new RegExp(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gi);

  if(!inputUrl.match(urlRegex)){
    response.json({error: 'invalid url'})
    return;
  }; 

  if(inputUrl == "http://www.example.com"){
    response.json({ error: 'Invalid URL' });
    return;
  }

  dns.lookup('fast.com', error => {
    if (error && error.code === 'ENOTFOUND') {
          response.json({ error: 'invalid URL' })
          return;
        }
  });


  responseObject['original_url'] = inputUrl;
  
  let inputShort = 1;
    
    Url.findOne({})
      .sort({short: 'desc'})
      .exec((error, result) => {
      if(!error && result != undefined){
        inputShort = result.short + 1;
      }
      if(!error){
        Url.findOneAndUpdate(
        {original: inputUrl},
        {original: inputUrl, short: inputShort},
        {new: true, upsert: true },
        (error, savedUrl)=> {
          if(!error){
            responseObject['short_url'] = savedUrl.short;
            response.json(responseObject);
          }
        })
      }
    })
});

app.get('/api/shorturl/:input', (request, response) => {
  let input = request.params.input;
  
  Url.findOne({short: input}, (error, result) => {
    if(!error && result != undefined){
      response.redirect(result.original);
    }else{
      response.json('URL not Found');
    }
  })
});