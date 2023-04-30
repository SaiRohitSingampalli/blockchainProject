var express = require('express');
var engines = require('consolidate');
const fs = require('fs');

var app = express();

app.use(express.static('src'));
app.use(express.static('../warehousereceipt-contract/build/contracts'));

app.set('views', __dirname + '/src/views');
app.engine('html', engines.ejs);
app.set('view engine', 'html');
app.use(express.json());


app.get('/', function (req, res) {
  res.redirect('/receipt');
});

app.get('/receipt', function (req, res) {
  res.render('receipt.html');
})

app.get('/myreceipts', function (req, res) {
  res.render('myreceipts.html');
});

app.get('/receiptbuyandbid', function (req, res) {
  res.render('receiptbuyandbid.html');
});

const loadReceiptData =  () => {
  receiptDataBuffer = fs.readFileSync("./receipts.json");
  receiptDataBufferJSON = receiptDataBuffer.toString();
  receipts = JSON.parse(receiptDataBufferJSON);
  return receipts
}

const saveReceiptData =  (updatedReceiptData) => {
  const updatedReceiptDataJSON = JSON.stringify(updatedReceiptData);
  fs.writeFileSync("./receipts.json", updatedReceiptDataJSON);
  return true;
}

const fetchReceipt = (id) => {
  const receiptsDataFetched=loadReceiptData();
  const receiptsFiltered = receiptsDataFetched.filter(obj=> (obj.tokenId == id));
  if(receiptsFiltered.length == 0){
    return false;
  } else {
    return receiptsFiltered[0].uri;
  }
}

app.get('/load', function (req, res) {
  const listReceipts = loadReceiptData();
  
  res.writeHead(200, {'Content-Type': 'application/json'});
  const jsonContent = JSON.stringify(listReceipts);
  res.end(jsonContent);
  
})

app.post('/update', function(req, res) { 
   const updatedReceiptData = req.body;
   const updatedListStatus = saveReceiptData(updatedReceiptData);

 
   res.json({ message: updatedListStatus });
  

})

app.get('/receipt/:id', function(req, res) {

  const assetURI = fetchReceipt(req.params.id);

  if (assetURI == "http://localhost:3000/") {
    res.redirect('/receiptbuyandbid');
  } else if (assetURI) {
    res.redirect(assetURI);
  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('Receipts Not Found');
  }
})

app.listen(3000, function () {
  console.log('Warehouse Receipt Dapp listening on port 3000!');
});

