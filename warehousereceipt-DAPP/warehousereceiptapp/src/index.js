var express = require('express');
var app = express();

app.set('views', './src/views');
app.use(express.json());
app.use(express.static('src'));
app.use(express.static('../warehousereceiptcontract/build/contracts'));


app.get('/', function (req, res) {
  res.redirect('/marketplace');
});

app.get('/marketplace', function (req, res) {
  res.render('marketplace.html');
});

app.get('/myprofile', function (req, res) {
  res.render('myprofile.html');
});

app.get('/moderator', function (req, res) {
  res.render('moderator.html');
})

app.listen(3000, function () {
  console.log('Dapp listening on port 3000!');
});
