App = {

  web3Connector: null,
  contracts: {},
  url: 'http://127.0.0.1:7545',
  baseUrl: 'http://localhost:3000',
  moderator: null,
  currentAccount: null,
  activeCount: 0,

  
  init: function () {
    App.initWeb3();

    if (window.location.href.endsWith('/myreceipts')){


      web3.eth.getAccounts(function(error, accounts) {
        var account = accounts[0];
        

        fetch(`${App.baseUrl}/load`)
          .then(resp => resp.json())
          .then(receiptFullList => {
            
            var data = receiptFullList.filter(objectData=> ((objectData.seller == account) && (objectData.destroy == false)));
           
            var receiptRows = $('#receipt-row');
            var receipt = $('#receipt-holder');
            for (i = 0; i < data.length; i ++) {
              receipt.find('.receipt-title').text(data[i].name);
              receipt.find('.receipt-id').text(data[i].tokenId);
              receipt.find('.receipt-price').text(data[i].price);
              receipt.find('.activate-button').attr('data-id', data[i].tokenId);
              receipt.find('.deactivate-button').attr('data-id', data[i].tokenId);
              receiptRows.append(receipt.html());

            }

          })
        
      })
        
    } else if (window.location.href.endsWith('/receiptbuyandbid')) {
      web3.eth.getAccounts(function(error, accounts) {
        var account = accounts[0];
        fetch(`${App.baseUrl}/load`)
          .then(resp=> resp.json())
          .then(receiptFullList => {
            var data = receiptFullList.filter(objectData => ((objectData.active == true) && (objectData.destroy == false) && (objectData.burnit == false) &&(objectData.seller != account)));
            var receiptRows = $('#receipt-row');
            var receipt = $('#receipt-holder');
            for (i = 0; i < data.length; i ++) {
              receipt.find('.receipt-title').text(data[i].name);
              receipt.find('.receipt-id').text(data[i].tokenId);
              receipt.find('.receipt-price').text(data[i].price);
              receipt.find('.highest-bid').text(data[i].highestBid);
              receipt.find('.buy-button').attr('data-id', data[i].tokenId);
              receipt.find('.buy-button').attr('data-price', data[i].price);
              receiptRows.append(receipt.html());
            }
          })
      })
    }
  },

  initWeb3: function () {
    // Is there is an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Connector = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fallback to the TestRPC
      App.web3Connector = new Web3.providers.HttpProvider(App.url);
    }
    web3 = new Web3(App.web3Connector);
    ethereum.enable();
    App.populateAddress();
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('DigitalWarehouseReceipt.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var receiptArtifact = data;
      App.contracts.receipt = TruffleContract(receiptArtifact);
      App.contracts.receipt.setProvider(App.web3Connector);
      App.currentAccount = web3.eth.coinbase;
      jQuery('#current_account').text(App.currentAccount);
      return App.bindEvents();
    });
  },

  bindEvents: function () {
    $(document).on('click', '#generate-receipt', App.handleCreateWarehouseReceipt);
    $(document).on("click", "#grant-access", App.handleGrantAccess);
    $(document).on("click", "#revoke-access", App.handleRevokeAccess);
    $(document).on("click", ".activate-button", App.handleActivateWarehouseReceipt);
    $(document).on("click", ".deactivate-button", App.handleDeactivateWarehouseReceipt);
    $(document).on("click", ".buy-button", App.handleBuyReceipt);
    $(document).on("click", ".update-price", App.handleUpdateprice);
    $(document).on("click", ".destroy", App.handleAllowDestroy);
    $(document).on("click", "#destroy-receipt", App.handleDestroyReceipt);
    $(document).on("click", "#update-price", App.handleBidForReceipt);
    $(document).on("click", "#get-details", App.handleReceiptDetails);
    $(document).on("click", "#total-receipt-count", App.handleActiveCount);
    $(document).on("click", "#get-sample-receipt", App.handleReceipt);
  },

  populateAddress: function () {
    new Web3(new Web3.providers.HttpProvider(App.url)).eth.getAccounts((err, accounts) => {
      jQuery.each(accounts, function (i) {
        if (web3.eth.coinbase != accounts[i]) {
          var optionElement = '<option value="' + accounts[i] + '">' + accounts[i] + '</option';
          jQuery('#enter_address').append(optionElement);
        }
      });
    });
  },

  handleReceipt: function () {

    var tokenId = $("#receipt-number3").val();
    openuri = "http://localhost:3000/receipt/".concat(tokenId);
    window.open(openuri);

  },

  handleActiveCount: function (){ 

    fetch(`${App.baseUrl}/load`)
      .then(resp=> resp.json())
      .then(receiptsData => {
        var activeCountReceipts = receiptsData.filter(obj => (obj.active == true));
        const displayActiveCount = "Active Receipt Count: ".concat(activeCountReceipts.length);
        App.activeCount = displayActiveCount;
        alert(App.activeCount);

    })
  },

  handleBuyReceipt: function (event) {

    var tokenId = parseInt($(event.target).data('id'));
    var price = parseInt($(event.target).data('price'));
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
 
      App.contracts.receipt.deployed().then(function (instance) {
        buyerInstance = instance;
        return buyerInstance.buyReceipt(tokenId,{from: account,value:price*1e18});
      }).then(function (result, err) {
        if (result) {
          fetch(`${App.baseUrl}/load`)
            .then(resp=> resp.json())
            .then(receiptsData => {
              var position = 0;
              for (i=0; i<=receiptsData.length; i++) {
                if (receiptsData[i].tokenId == tokenId) {
                  position = i;
                  break;
                }
              }

              receiptsData[position].active = false;
              receiptsData[position].seller = account;
              fetch(`${App.baseUrl}/update`,{
                method: "POST",
                headers:{'Content-Type': 'application/json'},
                body: JSON.stringify(receiptsData)
              })
              .then(resp=> resp.json())
              .then(resp=>console.log(resp))
                alert("Successfully purchased the receipt");
                location.reload();  
          })
        }
      }).catch(function (err) {
        alert("Transaction was not successful");
       
      });
    });
  },

  handleActivateWarehouseReceipt: function (event) {
  
    var tokenId = parseInt($(event.target).data('id'));
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      
        App.contracts.receipt.deployed().then(function (instance) {
          sellerInstance = instance;
          return sellerInstance.activateReceipt(tokenId, {from: account});
        }).then(function (result, err) {
          if (result) { 
            fetch(`${App.baseUrl}/load`)
            .then(resp=> resp.json())
            .then(receiptsData => {
              var position = 0;
              for (i=0; i<=receiptsData.length; i++) {
                if (receiptsData[i].tokenId == tokenId) {
                  position = i;
                  break;
                }
              }

              receiptsData[position].active = true;
            
              fetch(`${App.baseUrl}/update`,{
                method: "POST",
                headers:{'Content-Type': 'application/json'},
                body: JSON.stringify(receiptsData)
              })
              .then(resp=> resp.json())
              .then(resp=>console.log(resp))
            alert("Successfully activated the receipt");
          })
        }
        }).catch(function (err) {
          alert("Unable to activate the receipt. Try using seller account");
        });
      
    });
  },

  handleDeactivateWarehouseReceipt: function (event) {
    
    var tokenId = parseInt($(event.target).data('id'));

    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
        App.contracts.receipt.deployed().then(function (instance) {
          sellerInstance = instance;
          return sellerInstance.deactivateReceipt(tokenId,{from: account});
        }).then(function (result, err) {
          if (result) { 
            fetch(`${App.baseUrl}/load`)
            .then(resp=> resp.json())
            .then(receiptsData => {

              var position = 0;
              for (i=0; i<=receiptsData.length; i++) {
                if (receiptsData[i].tokenId == tokenId) {
                  position = i;
                  break;
                }
              }

              receiptsData[position].active = false;
            
              fetch(`${App.baseUrl}/update`,{
                method: "POST",
                headers:{'Content-Type': 'application/json'},
                body: JSON.stringify(receiptsData)
              })
              .then(resp=> resp.json())
              .then(resp=>console.log(resp))
            alert("Successfully deactivated the receipt");
          })
        }
        }).catch(function (err) {
          alert("Unable to deactivate the receipt. Try using seller account.");
        });
      
    });
  },


  handleCreateWarehouseReceipt: function () {
    
    var sellerAddress = $("#seller-address-2").val();
    var ethprice = $("#price").val();
    var sellerPrice = (parseInt($("#price").val())*1e18).toString();
    var receiptName = $("#receipt-name").val();
    var account;
    var tokenId;
    var uri = $("#uri-input").val() || "http://localhost:3000/";

    web3.eth.getAccounts(function(error, accounts) {
      account = accounts[0];
      App.contracts.receipt.deployed().then(function (instance) {
        moderatorInstance = instance;
  
        return moderatorInstance.createWarehouseReceipt( sellerAddress, uri, sellerPrice, receiptName, {from: account });   
      }).then(function (result, err) {

        if (result) {
          tokenId = parseInt(result.logs[1].args.tokenId);
          fetch(`${App.baseUrl}/load`)
            .then(resp=> resp.json())
            .then(receiptsData => {
              receiptsData.push({
                tokenId : tokenId,
                name: receiptName,
                price: ethprice,
                seller: sellerAddress,
                highestBid: 0,
                highestBidder: "",
                active: false,
                uri: uri,
                burnit: false,
                destroy: false,
              })
              fetch(`${App.baseUrl}/update`,{
                method: "POST",
                headers:{'Content-Type': 'application/json'},
                body: JSON.stringify(receiptsData)
              })
              .then(resp=> resp.json())
              .then(resp=>console.log(resp))
              alert("Warehouse Receipt is created");    
            }).catch(function (err) {
              alert("Warehouse receipt generation failed");
            })

        }
      })
    })
  },

  handleGrantAccess: function () {
    
    var warehouseParticipant = $("#seller-address").val();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      if (warehouseParticipant === "") {
        alert("Please enter proper EOA address", "Reverted!");
        return false;
    } else { 
        App.contracts.receipt.deployed().then(function (instance) {
          moderatorInstance = instance;
          return moderatorInstance.grantWarehouseRole(warehouseParticipant,{from: account});
        }).then(function (result, err) {
          if (result) { 
            alert("Successfully granted warehouse participant");
            App.moderator = account;
          }
        }).catch(function (err) {
          alert("Unable to grant the access. Try using moderator account.");
        });
      }});
  },

  handleRevokeAccess: function () {
    
    var warehouseParticipant = $("#seller-address").val();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      if (warehouseParticipant === "") {
        alert("Please enter proper EOA address", "Reverted!");
        return false;
      } else { 
          App.contracts.receipt.deployed().then(function (instance) {
            moderatorInstance = instance;
            return moderatorInstance.revokeWarehouseRole(warehouseParticipant,{from: account});
          }).then(function (result, err) {
            if (result) { 
              alert("Successfully revoked warehouse participant");
            }
          }).catch(function (err) {
              alert("Unable to revoke the access. Try using moderator account.");        
          });
      }
    });
  },

  handleUpdateprice: function (event) {
    
   
    var tokenId = $("#receipt-number").val();
    var jprice = $("#price").val();
    var price = (parseInt($("#price").val())*1e18).toString();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      if (tokenId === "" || (price <= 0)) {
        alert("Please enter valid tokenID and price", "Reverted!");
        return false;
      } else { 
        App.contracts.receipt.deployed().then(function (instance) {
          sellerInstance = instance;
          return sellerInstance.setPrice(tokenId, price, {from: account});
        }).then(function (result, err) {
          if (result) { 
            fetch(`${App.baseUrl}/load`)
              .then(resp=> resp.json())
              .then(receiptsData => {

                var position = 0;
                for (i=0; i<=receiptsData.length; i++) {
                  if (receiptsData[i].tokenId == tokenId) {
                    position = i;
                    break;
                  }
                }

                receiptsData[position].price = jprice;
                
                fetch(`${App.baseUrl}/update`,{
                  method: "POST",
                  headers:{'Content-Type': 'application/json'},
                  body: JSON.stringify(receiptsData)
                })
                .then(resp=> resp.json())
                .then(resp=>console.log(resp))
                  alert("Successfully updated price for the receipt");            
                  location.reload();
              })
          }
        }).catch(function (err) {
          alert("Unable to update price for the receipt");
        });
      }
    });
  },

  handleAllowDestroy: function () {
    
    var tokenId = $("#receipt-number1").val();
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      if (tokenId === "") {
        alert("Please enter valid tokenID", "Reverted!");
        return false;
      } else { 
        App.contracts.receipt.deployed().then(function (instance) {
          sellerInstance = instance;
          return sellerInstance.allowTokenDestroy(tokenId, {from: account});
        }).then(function (result, err) {
          if (result) { 
           
            fetch(`${App.baseUrl}/load`)
              .then(resp=> resp.json())
              .then(receiptsData => {

                var position = 0;
                for (i=0; i<=receiptsData.length; i++) {
                  if (receiptsData[i].tokenId == tokenId) {
                    position = i;
                    break;
                  }
                }

                receiptsData[position].burnit = true;
              
                fetch(`${App.baseUrl}/update`,{
                  method: "POST",
                  headers:{'Content-Type': 'application/json'},
                  body: JSON.stringify(receiptsData)
                })
                .then(resp=> resp.json())
                .then(resp=>console.log(resp))
                  alert("Successfully allow the receipt burn");
             })
          }
        }).catch(function (err) {
          alert("Unable to allow the receipt burn");
        });
      }
    });
  },

  handleDestroyReceipt: function () {
    
    var tokenId = $("#receipt-number").val();
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      if (tokenId === "") {
        alert("Please enter valid tokenID", "Reverted!");
        return false;
      } else { 
        App.contracts.receipt.deployed().then(function (instance) {
          sellerInstance = instance;
          return sellerInstance.destroyToken(tokenId, {from: account});
        }).then(function (result, err) {
          if (result) { 
           
            fetch(`${App.baseUrl}/load`)
              .then(resp=> resp.json())
              .then(receiptsData => {

                var position = 0;
                for (i=0; i<=receiptsData.length; i++) {
                  if (receiptsData[i].tokenId == tokenId) {
                    position = i;
                    break;
                  }
                }

                receiptsData[position].burnit = true;
                receiptsData[position].destroy = true;
                receiptsData[position].active = false;
              
                fetch(`${App.baseUrl}/update`,{
                  method: "POST",
                  headers:{'Content-Type': 'application/json'},
                  body: JSON.stringify(receiptsData)
                })
                .then(resp=> resp.json())
                .then(resp=>console.log(resp))
              alert("Receipt destroyed successfully");
             })
          }
        }).catch(function (err) {
          alert("Unable to destroy the receipt. Try using warehouse account.");
        });
      }
    });
  },

  handleReceiptDetails: function () {
    
    var tokenId = $("#receipt-number2").val();
    var counter = 0;
    web3.eth.getAccounts(function(error, accounts) {
      var tokenDetails;
      if (tokenId == "") {
        alert("Please enter valid receipt number");
        return false;
      } else {
        fetch(`${App.baseUrl}/load`)
        .then(resp=> resp.json())
        .then(receiptsData => {
          for (i=0; i<=receiptsData.length; i++) {
            if ((receiptsData[i].tokenId == tokenId) && (receiptsData[i].active == true)) {
              tokenDetails = "Receipt Name:".concat(" ", receiptsData[i].name, "\n",
                 "Receipt Id:", " ", receiptsData[i].tokenId, "\n",
                 "Price:", receiptsData[i].price, "\n",
                 "Seller Address:", receiptsData[i].seller, "\n",
                 "Highest Bid:", receiptsData[i].highestBid, "\n",
                 "Highest Bidder:", receiptsData[i].highestBidder, "\n"

              );
              counter = 1;
              alert(tokenDetails);
              return receiptsData[i];
            } 
          }

          if (counter == 0) {
            alert("Invaid Receipt Detais or Inactive Receipt");
          }

      })
    }
  })
  },

  handleBidForReceipt: function () {
    
    var tokenId = $("#receipt-number").val();
    var bid = $("#price").val();
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      if (tokenId == "") {
        alert("Please enter valid tokenID", "Reverted!");
        return false;
      } else {
        App.contracts.receipt.deployed().then(function (instance) {
          buyerInstance = instance;
          return buyerInstance.bidForReceipt(tokenId, bid, {from: account});
        }).then(function (result, err) {
          if (result) {
            fetch(`${App.baseUrl}/load`)
              .then(resp=> resp.json())
              .then(receiptsData => {
                var position = 0;
                for (i=0; i<=receiptsData.length; i++) {
                  if (receiptsData[i].tokenId == tokenId) {
                    position = i;
                    break;
                  }
                }

                receiptsData[position].highestBid = bid;
                receiptsData[position].highestBidder = account;
                fetch(`${App.baseUrl}/update`,{
                  method: "POST",
                  headers:{'Content-Type': 'application/json'},
                  body: JSON.stringify(receiptsData)
                })
                .then(resp=> resp.json())
                .then(resp=>console.log(resp))
                alert("Bid placed successfully");
                location.reload();

              })
            }
          }).catch(function (err) {
                
                alert("Error in submitting bids");
          });
        }
      });
  }

};


$(function () {
  $(window).load(function () {
    App.init();
  });
});

// code for reloading the page on account change
window.ethereum.on('accountsChanged', function (){
  location.reload();
})