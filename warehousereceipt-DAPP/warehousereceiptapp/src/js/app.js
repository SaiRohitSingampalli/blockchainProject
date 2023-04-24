App = {
  web3Provider: null,
  contracts: {},
  names: new Array(),
  url: 'http://127.0.0.1:7545',
  backendUrl: 'http://localhost:3000',
  // network_id: 5777,
  chairPerson: null,
  currentAccount: null,

  init: function () {
    console.log("Checkpoint 0");
    return App.initWeb3();
  },

  initWeb3: function () {
    // Is there is an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fallback to the TestRPC
      App.web3Provider = new Web3.providers.HttpProvider(App.url);
    }
    web3 = new Web3(App.web3Provider);
    ethereum.enable();
    App.populateAddress();

    return App.initContract();
  },

  initContract: function () {
    $.getJSON('DigitalWarehouseReceipt.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract

      var receiptArtifact = data;
      App.contracts.receipt = TruffleContract(receiptArtifact);
      App.contracts.receipt.setProvider(App.web3Provider);
      App.currentAccount = web3.eth.coinbase;
      jQuery('#current_account').text(App.currentAccount);
      chairPerson = App.currentAccount; //update chairperson as soon as initialized
      return App.bindEvents();
    });
  },

  bindEvents: function () {

    $(document).on("click", "#grant-access", App.handleGrantAccess);
    $(document).on("click", "#revoke-access", App.handleGrantAccess);
    $(document).on("click", "#generate-receipt", App.handleCreateWarehouseReceipt);
    $(document).on("click", "#destroy-receipt", App.handleDestroyWarehouseReceipt);
    $(document).on("click", "#activate-receipt", App.handleActivateWarehouseReceipt);
    $(document).on("click", "deactivate-receipt", App.handleDeactivateWarehouseReceipt);
    $(document).on("click", "setprice-receipt", App.handleSetprice);
    $(document).on("click", "allow-token-destroy", App.handleAllowDestroy);
    $(document).on("click", "total-active-count", App.handleTotalActiveCount);
    //$(document).on("click", "token-details", App.handleReceiptDetails);
    $(document).on("click", "bid-for-receipt", App.handleBidForReceipt);
    $(document).on("click", "buy-receipt", App.handleBuyReceipt);

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

  
  getErrorMessage: function (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    //let errorReason = "";

    if (errorCode === 4001) {
      return "User rejected the request!";
    } else if (
      errorMessage.includes("Access Denied: user is not the contract deployer!")
    ) {
      return "Access Denied: The address calling this function is not the deployer!";
    } else if (
      errorMessage.includes(
        "Access Denied: counterPhase is not at Initialized!"
      )
    ) {
      return "Access Denied: Counter has not been initialized!";
    } else {
      return "Unexpected Error!";
    }
  },

  handleGrantAccess: function () {
    console.log("Here to grant access");
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
        }
      }).catch(function (err) {
        console.log(err);
        alert("Unable to grant the access");
      });
    }});
  },

  handleRevokeAccess: function () {
    console.log("Here to revoke access");
    var warehouseParticipant = $("#seller-address").val();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
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
          alert("Successfully revoked warehouse participant");
        }
      }).catch(function (err) {
        console.log(err);
        alert("Unable to revoke the access");
      });
    }});
  },

  handleCreateWarehouseReceipt: function () {
    console.log("Here");
    //event.preventDefault();

    var sellerName = $("#receipt-name").val();
    var sellerAddress = $("#seller-address-2").val();
    var sellerPrice = $("#price").val();

    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
      App.contracts.receipt.deployed().then(function (instance) {
        bidInstance = instance;

        return bidInstance.createWarehouseReceipt(sellerAddress,'http://google.com', sellerPrice, "random", {from: account }); // added from parameter
      }).then(function (result, err) {
        if (result) {
            alert("Receipt generated Successfully!");
        }
      }).catch(function (err) {
        alert("Receipt generation failed!");
      });
    });
  },

  handleDestroyWarehouseReceipt: function () {
    console.log("Here to destroy the receipt");
    var tokenId = $("#seller-address-1").val();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
    if (warehouseParticipant === "") {
      toastr.error("Please enter tokenID", "Reverted!");
      return false;
    } else if (account === chairPerson) { //check whether moderator
      App.contracts.receipt.deployed().then(function (instance) {
        moderatorInstance = instance;
        return moderatorInstance.destroyToken(tokenId);
      }).then(function (result, err) {
        if (result) { 
          toastr.success("Successfully destroyed the receipt")
        }
      }).catch(function (err) {
        alert("Unable to destroy the receipt");
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
    }});
  },

  handleActivateWarehouseReceipt: function () {
    console.log("Here to activate the ticket");
    var tokenId = $("#seller-address-1").val();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
    if (warehouseParticipant === "") {
      toastr.error("Please enter tokenID", "Reverted!");
      return false;
    } else { 
      App.contracts.receipt.deployed().then(function (instance) {
        sellerInstance = instance;
        return sellerInstance.activateReceipt(tokenId);
      }).then(function (result, err) {
        if (result) { 
          toastr.success("Successfully activated the receipt")
        }
      }).catch(function (err) {
        alert("Unable to activate the receipt");
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
    }});
  },

  handleDeactivateWarehouseReceipt: function () {
    console.log("Here to deactivate the ticket");
    var tokenId = $("#seller-address-1").val();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
    if (warehouseParticipant === "") {
      toastr.error("Please enter tokenID", "Reverted!");
      return false;
    } else { 
      App.contracts.receipt.deployed().then(function (instance) {
        sellerInstance = instance;
        return sellerInstance.deactivateReceipt(tokenId);
      }).then(function (result, err) {
        if (result) { 
          toastr.success("Successfully deactivated the receipt")
        }
      }).catch(function (err) {
        alert("Unable to deactivate the receipt");
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
    }});
  },

  handleSetprice: function () {
    console.log("Here to setprice for receipt");
    var tokenId = $("#seller-address-1").val();
    var price = $("#seller-address-1").val();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
    if (tokenId === "" || !(price > 0)) {
      toastr.error("Please enter valid tokenID and price", "Reverted!");
      return false;
    } else { 
      App.contracts.receipt.deployed().then(function (instance) {
        sellerInstance = instance;
        return sellerInstance.setPrice(tokenId, price);
      }).then(function (result, err) {
        if (result) { 
          toastr.success("Successfully setprice for the receipt")
        }
      }).catch(function (err) {
        alert("Unable to setprice for the receipt");
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
    }});
  },

  handleAllowDestroy: function () {
    console.log("Here to allow to destroy the receipt");
    var tokenId = $("#seller-address-1").val();
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
    if (tokenId === "") {
      toastr.error("Please enter valid tokenID", "Reverted!");
      return false;
    } else { 
      App.contracts.receipt.deployed().then(function (instance) {
        sellerInstance = instance;
        return sellerInstance.setPrice(tokenId);
      }).then(function (result, err) {
        if (result) { 
          toastr.success("Successfully allow the receipt burn")
        }
      }).catch(function (err) {
        alert("Unable to allow the receipt burn");
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
    }});
  },

  handleTotalActiveCount: function () {
    console.log("Here for total count of active receipts");
    
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
 
      App.contracts.receipt.deployed().then(function (instance) {
        sellerInstance = instance;
        return sellerInstance.totalActiveCount();
      }).then(function (result, err) {
        if (result) { 
          toastr.success("success")
        }
      }).catch(function (err) {
        alert("error in fetching active count of receipts");
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
    });
  },

  handleBidForReceipt: function () {
    console.log("Here for bidding");
    var tokenId = $("#seller-address-1").val();
    var bid = $("#seller-address-1").val();
    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
 
      App.contracts.receipt.deployed().then(function (instance) {
        buyerInstance = instance;
        return buyerInstance.bidForReceipt(tokenId, bid);
      }).then(function (result, err) {
        if (result) { 
          toastr.success("successfully placed bid")
        }
      }).catch(function (err) {
        alert("error in submitting bids");
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
    });
  },

  handleBuyReceipt: function () {
    console.log("Here for buying");
    var tokenId = $("#seller-address-1").val();

    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];
 
      App.contracts.receipt.deployed().then(function (instance) {
        buyerInstance = instance;
        return buyerInstance.buyReceipt(tokenId);
      }).then(function (result, err) {
        if (result) { 
          toastr.success("successfully bought the receipt")
        }
      }).catch(function (err) {
        alert("transaction was not successful");
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
    });
  },
  

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
