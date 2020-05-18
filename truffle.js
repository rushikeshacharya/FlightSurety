var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "coral edit walk trade expect inmate enroll collect express jeans appear family";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*',
      gas: 8000000,
      gasLimit: 8000000,

    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};