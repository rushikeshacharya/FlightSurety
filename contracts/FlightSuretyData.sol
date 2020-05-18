pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       Structures                                     */
    /********************************************************************************************/
    struct Airlines {
        bool isRegistered;
        bool isOperational;
    }
    struct Insurance {
        address passenger;
        uint256 amount;
    }
    struct Voters {
        bool status;
    }

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    mapping(address => uint256) private authorizedCaller;
    mapping(address => Airlines) airlines;
    // mapping of airline address to Airlines struct
    mapping(address => Insurance) insurance;
    // mapping of Airline address to Insurance
    mapping(address => uint256) balances;
    mapping(address => uint256) fund;
    address[] multiCalls = new address[](0);
    mapping(address => Voters) voters;
    mapping(address => uint256) private voteCount;
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AuthorizedContract(address authContract);
    event DeAuthorizedContract(address authContract);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() public {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */

    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */

    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
    function setMultiCalls(address account) private {
        multiCalls.push(account);
    }

    function multiCallsLength()
        external
        requireIsOperational
        returns (uint256)
    {
        return multiCalls.length;
    }

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */

    function getAirlineStatus(address account)
        external
        requireIsOperational
        returns (bool)
    {
        return airlines[account].isOperational;
    }

    function setAirlineStatus(address account, bool status)
        external
        requireIsOperational
    {
        airlines[account].isOperational = status;
    }

    function getRegistrationStatus(address account)
        external
        requireIsOperational
        returns (bool)
    {
        return airlines[account].isRegistered;
    }

    function getVoteCounter(address account)
        external
        requireIsOperational
        returns (uint256)
    {
        return voteCount[account];
    }

    function resetVoteCounter(address account) external requireIsOperational {
        delete voteCount[account];
    }

    function getVoterStatus(address voter)
        external
        requireIsOperational
        returns (bool)
    {
        return voters[voter].status;
    }

    function addVoters(address voter) external {
        voters[voter] = Voters({status: true});
    }

    function addVoterCounter(address airline, uint256 count) external {
        uint256 vote = voteCount[airline];
        voteCount[airline] = vote.add(count);
    }

    function registerInsurance(
        address airline,
        address passenger,
        uint256 amount
    ) external requireIsOperational {
        insurance[airline] = Insurance({passenger: passenger, amount: amount});
        uint256 getFund = fund[airline];
        fund[airline] = getFund.add(amount);
    }

    function fundAirline(address airline, uint256 amount) external {
        fund[airline] = amount;
    }

    function getAirlineFunding(address airline) external returns (uint256) {
        return fund[airline];
    }

    function authorizeCaller(address contractAddress)
        external
        requireContractOwner
    {
        authorizedCaller[contractAddress] = 1;
        emit AuthorizedContract(contractAddress);
    }

    function deAuthorizeContract(address contractAddress)
        external
        requireContractOwner
    {
        delete authorizedCaller[contractAddress];
        emit DeAuthorizedContract(contractAddress);
    }

    function _registerAirline(address account, bool isOperational)
        external
        requireIsOperational
    {
        airlines[account] = Airlines({
            isRegistered: true,
            isOperational: isOperational
        });
        setMultiCalls(account);
    }

    function isAirline(address account) external returns (bool) {
        require(account != address(0), "Zero address not allowed");
        return airlines[account].isRegistered;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */

    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(address airline, address passenger, uint256 amount)
        external
        requireIsOperational
    {
        uint256 requiredAmount = insurance[airline].amount.mul(3).div(2);

        require(
            insurance[airline].passenger == passenger,
            "Passenger is not Insured"
        );

        require(requiredAmount == amount, "Invalid Amount");

        require(
            (passenger != address(0)) && (airline != address(0)),
            "Zero address not allowed"
        );
        balances[passenger] = amount;
    }

    function withdraw(address passenger)
        external
        requireIsOperational
        returns (uint256)
    {
        uint256 withdrawCash = balances[passenger];
        delete balances[passenger];
        return withdrawCash;
    }

    function getInsuredAmount(address airline)
        external
        requireIsOperational
        returns (address, uint256)
    {
        return (insurance[airline].passenger, insurance[airline].amount);
    }

    function getPassengerCredit(address passenger)
        external
        requireIsOperational
        returns (uint256)
    {
        return balances[passenger];
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }
}
