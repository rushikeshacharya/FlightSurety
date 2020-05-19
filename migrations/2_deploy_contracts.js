const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function (deployer) {

        let firstAirline = '0x4a945945f277Ea6386Cdc7907b6bc25E2B96B6b3';
        deployer.deploy(FlightSuretyData)
            .then(() => {
                return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                    .then(() => {
                        let config = {
                            localhost: {
                                url: 'http://localhost:7545',
                                dataAddress: FlightSuretyData.address,
                                appAddress: FlightSuretyApp.address
                            }
                        }
                        fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
                        fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
                    });
            });
}