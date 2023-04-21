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
    // console.log("Checkpoint 0");
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
      App.contracts.receipts = TruffleContract(receiptArtifact);
      App.contracts.receipts.setProvider(App.web3Provider);
      return App.bindEvents();
    });
  },

  bindEvents: function () {

    $(document).on("click", "#grant-access", function () {
      App.handleGrantAccess(jQuery("#seller-address").val());
    });
    $(document).on("click", "#revoke-access", function () {
      App.handleGrantAccess(jQuery("#seller-address").val());
    });
    $("form").submit(App.handleCreateWarehouseReceipt);

  },

  
  getErrorMessage: function (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    let errorReason = "";

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

  handleGrantAccess: function (warehouseApplicant) {

    if (warehouseApplicant === "") {
      toastr.erro("Please enter proper EOA address", "Reverted!");
      return false;
    }

    var option = { from: App.handler };
    App.contracts.DigitalWarehouseReceipt.methods
      .grantWarehouseRole(warehouseApplicant)
      .send(option)
      .on("receipt", (receipt) => {
        toastr.success("Successfully added warehouse participant")
      })
      .on("error", (err) => {
        toastr.error(App.getErrorMessage(err), "Reverted!");
      });
  },

  handleRevokeAccess: function (warehouseParticipant) {

    if (warehouseParticipant === "") {
      toastr.erro("Please enter proper EOA address", "Reverted!");
      return false;
    }

    var option = { from: App.handler };
    App.contracts.DigitalWarehouseReceipt.methods
      .revokeWarehouseRole(warehouseParticipant)
      .send(option)
      .on("receipt", (receipt) => {
        toastr.success("Successfully revoked warehouse participant")
      })
      .on("error", (err) => {
        toastr.error(App.getErrorMessage(err), "Reverted!");
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
