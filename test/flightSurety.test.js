const Test = require("../config/testConfig.js");
const BigNumber = require("bignumber.js");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
contract("Flight Surety Tests", async (accounts) => {
  var config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    config.flightSuretyData = await FlightSuretyData.new();
    config.flightSuretyApp = await FlightSuretyApp.new(
      config.flightSuretyData.address
    );
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address
    );
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async () => {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async () => {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async () => {
    // Ensure that access is allowed for Contract Owner account

    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async () => {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {
        from: config.firstAirline,
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });

  it("function call is made when multi-party threshold is reached", async () => {
    let admin1 = accounts[1];
    let admin2 = accounts[2];
    let admin3 = accounts[3];
    let admin4 = accounts[4];

    try {
      await config.flightSuretyApp.registerAirline(admin1, {
        from: config.owner,
      });
      await config.flightSuretyApp.registerAirline(admin2, {
        from: config.owner,
      });
      await config.flightSuretyApp.registerAirline(admin3, {
        from: config.owner,
      });
      await config.flightSuretyApp.registerAirline(admin4, {
        from: config.owner,
      });
    } catch (e) {
      console.log("Error", e);
    }

    let result = await config.flightSuretyData.isAirline.call(admin4);
    assert.equal(result, false, "Multi-party call was successful");
  });

  it("Ariline should be operational only when it has funded 10 ether", async () => {
    let admin2 = accounts[2];
    let admin3 = accounts[3];
    let fundPrice = web3.utils.toWei("10", "ether");

    try {
      await config.flightSuretyApp.fund({ from: admin2, value: fundPrice });
      await config.flightSuretyApp.fund({ from: admin3, value: fundPrice });
    } catch (e) {
      console.log("Error: Funding has failed", e);
    }

    let result = await config.flightSuretyData.getAirlineStatus.call(admin3);
    assert.equal(result, true, "Airline is not operational");
  });

  it("should Vote when multi-party threshold is reached", async () => {
    let admin2 = accounts[2];
    let admin3 = accounts[3];
    let admin4 = accounts[4];
    let status = null;

    try {
      let registrationStatus = await config.flightSuretyApp.registerAirline.call(
        admin4,
        { from: admin3 }
      );
      status = await config.flightSuretyData.isAirline.call(admin4);

      if (registration_status[0] == false && registration_status[1] == false) {
        await config.flightSuretyApp.approveAirlineRegistration(admin4, true, {
          from: config.owner,
        });
        await config.flightSuretyApp.approveAirlineRegistration(admin4, true, {
          from: admin3,
        });
        await config.flightSuretyApp.approveAirlineRegistration(admin4, false, {
          from: admin2,
        });
      }
      await config.flightSuretyApp.registerAirline(admin4, { from: admin3 });
    } catch (e) {
      console.log("Error in registration", e);
    }

    let result = await config.flightSuretyData.isAirline.call(admin4);
    assert.equal(result, true, "Failed to call Multi-party Voting!");
    assert.equal(
      status,
      false,
      "Airline should not be registered without Voting!"
    );
  });

  it("Passenger can buy inssurance for at most 1 ether", async () => {
    let passenger6 = accounts[6];
    let airline = accounts[2];
    let rawAmount = 1;
    let InsuredPrice = web3.utils.toWei(rawAmount.toString(), "ether");
    try {
      await config.flightSuretyApp.buy(airline, {
        from: passenger6,
        value: InsuredPrice,
      });
    } catch (e) {
      console.log("Error in buying insurance", e);
    }
    let result = await config.flightSuretyData.getInsuredAmount.call(airline);
    assert.equal(result[0], passenger6, "Status is not true");
  });

  it("Insured passenger should get credited if the Flight is delayed", async () => {
    let passenger = accounts[6];
    let airline = accounts[2];
    let creditStatus = true;
    let balance = 1.5;
    let creditAmountBefore = 0;
    let creditAmountAfter = 0;
    let STATUS_CODE_LATE_AIRLINE = 20;
    let flight = "IN009";
    let timestamp = Math.floor(Date.now() / 1000);

    try {
      // Check credit before passenger was credited
      creditAmountBefore = await config.flightSuretyApp.getCreditedAmount.call({
        from: passenger,
      });
      creditAmountBefore = web3.utils.fromWei(creditAmountBefore, "ether");
      // Credit the passenger
      await config.flightSuretyApp.processFlightStatus(
        airline,
        flight,
        timestamp,
        STATUS_CODE_LATE_AIRLINE
      );

      // Get credit after passenger has been credited
      creditAmountAfter = await config.flightSuretyApp.getCreditedAmount.call({
        from: passenger,
      });
      creditAmountAfter = web3.utils.fromWei(creditAmountAfter, "ether");
    } catch (e) {
      console.log("Error:", e);
      creditStatus = false;
    }

    assert.equal(balance, creditAmountAfter, "Credited balance does not tally");
    assert.equal(creditStatus, true, "Passenger was not credited");
  });

  it("Credited passenger can withdraw ether", async () => {
    let passenger = accounts[6];
    let withdraw = true;
    let balanceAmountBefore = 0;
    let balanceAmountAfter = 0;
    let ethBalanceAmountBefore = 0;
    let ethBalanceAmountAfter = 0;
    let credit = 1.5;

    try {
      balanceAmountBefore = await config.flightSuretyApp.getCreditedAmount.call(
        { from: passenger }
      );
      balanceAmountBefore = web3.utils.fromWei(balanceAmountBefore, "ether");

      ethBalanceAmountBefore = await web3.eth.getBalance(passenger);
      ethBalanceAmountBefore = web3.utils.fromWei(
        ethBalanceAmountBefore,
        "ether"
      );
      console.log("ETH balance before: ", ethBalanceAmountBefore);

      await config.flightSuretyApp.withdraw({ from: passenger });

      balanceAmountAfter = await config.flightSuretyApp.getCreditedAmount.call({
        from: passenger,
      });
      balanceAmountAfter = web3.utils.fromWei(balanceAmountAfter, "ether");

      ethBalanceAmountAfter = await web3.eth.getBalance(passenger);
      ethBalanceAmountAfter = web3.utils.fromWei(
        ethBalanceAmountAfter,
        "ether"
      );
    } catch (e) {
      withdraw = false;
    }

    assert.equal(withdraw, true, "Passenger could not withdraw amount!");
    assert.equal(balanceAmountBefore, credit, "Credit balance does not tally");
    assert.equal(balanceAmountAfter, 0, "Credit was't redrawn");
    assert.ok(
      balanceAmountAfter - balanceAmountBefore > 0,
      "Amount transfer failed"
    );
  });
});
