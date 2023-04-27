// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

//import openzeppelin functions for the project implementation
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DigitalWarehouseReceipt is ERC721, ERC721URIStorage, AccessControl, Ownable {
    using Counters for Counters.Counter;
    
    //roles definition participants in the blockchain
    bytes32 public constant MODERATOR = keccak256("DEFAULT_ADMIN_ROLE");
    bytes32 public constant WAREHOUSE = keccak256("MINTER_ROLE");

    Counters.Counter private _tokenIdCounter;
    uint public activeCount;

    //Token data structure definition
    struct WarehouseReceiptDetails{
        string name;
        bool active;
        uint256 price;
        address seller;
        address warehouse;
        bool burnit;
    }
    
    //initializing data used in the project
    mapping(uint256 => WarehouseReceiptDetails) public WarehouseReceipts;
    mapping(uint256 => uint256) public HighestBid;
    mapping(uint256 => address) public HighestBidder;
    
    //constructor runs immediately after the smart contract deployment
    constructor() ERC721("WarehouseReceiptToken", "WRT") {
        _grantRole(MODERATOR, msg.sender);  //automatically grants role when smart contract is deployed
        _tokenIdCounter.increment(); // Set the initial token ID to 1
    }

    //Definiing rules to checks whether the message is from seller or not
    modifier onlySeller(uint tokenId)
    { require(msg.sender == WarehouseReceipts[tokenId].seller);
      _;
    }

    //Receipt will be stored on this base url when deployed on node this function is due for further development with web interface  
    function _baseURI() internal pure override returns (string memory) {
        return "tokenURI/";
    }

    //Granting warehouse role to a user by only moderator
    function grantWarehouseRole(address to) public onlyRole(MODERATOR) returns (bool){
        _grantRole(WAREHOUSE, to);
        return true;
    }

    //Revoking warehouse role to the user by only moderator
    function revokeWarehouseRole(address to) public onlyRole(MODERATOR) returns (bool) { 
        _revokeRole(WAREHOUSE, to);
        return true;
    }

    //Creating warehouse receipts by authorized warehouse user only
    function createWarehouseReceipt(address to, string memory uri, uint256 price, string memory receiptName) public onlyRole(WAREHOUSE) returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        //Receipt detais are stored in warehouse receipt mapping 
        WarehouseReceipts[tokenId] = WarehouseReceiptDetails(
            receiptName,
            false,
            price,
            to,
            msg.sender,
            false
        );
        HighestBid[tokenId] = 0;
        activeCount += 1;
        _tokenIdCounter.increment();
        return tokenId;
    }

   //Buyer can bid the product for lower price than offered by seller, so that the seller can know and decrease the price of the product.
   function bidForReceipt(uint tokenId, uint bid) public returns (bool) { 
        address bidder = msg.sender;
         require(WarehouseReceipts[tokenId].seller != msg.sender, "Seller of the token can't place bid"); //seller can't place bid
        if ( bidder.balance <= bid || HighestBid[tokenId] > bid) { revert(); } //checking whether bidder has sufficient balance
        HighestBid[tokenId] = bid;  //highest bid will be updated
        HighestBidder[tokenId] = bidder; //highest bidder address is updated 
        return true;    
    }

    //Seller can activate the receipts as per requirement to enable trading
    function activateReceipt(uint tokenId) public returns (bool) {
        require(WarehouseReceipts[tokenId].active == false, "Certificate is already active for trading.");
        require(WarehouseReceipts[tokenId].seller == msg.sender, "Owner/Seller of the token receipt can change the status");
        WarehouseReceipts[tokenId].active = true;
        activeCount += 1;
        return true;
    }

    //A buyer can buy the receipt for the price offered by the seller and transaction happens along with the trasfer of the receipt ownership
    function buyReceipt(uint tokenId) public payable returns (bool) {
        require(WarehouseReceipts[tokenId].active == true, "Certificate is not active for buying.");
        require(WarehouseReceipts[tokenId].price == msg.value, "Incorrect amount, Recheck the price.");
        if(WarehouseReceipts[tokenId].seller == msg.sender){ revert(); }

        WarehouseReceipts[tokenId].active = false;
        address tokenOwner = WarehouseReceipts[tokenId].seller;
        _transfer(tokenOwner, msg.sender, tokenId);
        WarehouseReceipts[tokenId].seller = msg.sender;
        payable(tokenOwner).transfer(msg.value);
        activeCount -= 1;
        return true;
    }
    
    //A seller can Deactivate the receipts to pause the trade
    function deactivateReceipt(uint tokenId) public returns (bool) {
        require(WarehouseReceipts[tokenId].active == true, "Certificate is already inactive for trading.");
        require(WarehouseReceipts[tokenId].seller == msg.sender, "Owner/Seller of the token receipt can change the status");
        WarehouseReceipts[tokenId].active = false;
        activeCount -= 1;
        return true;
    }

    //A seller can change the price he is willing to sell
    function setPrice(uint tokenId, uint256 price) public onlySeller(tokenId) returns (uint256) {
        WarehouseReceipts[tokenId].price = price;
        return price;
    }

    //Once the product is delivered, the seller will allow the warehouse owner to destroy the token.
    function allowTokenDestroy(uint tokenId) public onlySeller(tokenId) returns (uint256) {
        WarehouseReceipts[tokenId].burnit = true;
        return true;
    }

    //After getting destroy approval from seller, warehouse owner destroys the token
    function destroyToken(uint tokenId) public onlyRole(WAREHOUSE) returns (bool) {
        if(!WarehouseReceipts[tokenId].burnit){
            revert();
        }
        require(msg.sender == WarehouseReceipts[tokenId].warehouse);
        _burn(tokenId);
        return true;
    }
    
    //Give the total number of active tokens in the system
    function totalActiveCount() public view returns (uint256) {
        return activeCount;
    }

    //Returns the details of the token
    function tokenDetails(uint tokenId) public view returns(address, uint256, bool, bool){
        return (msg.sender, WarehouseReceipts[tokenId].price, WarehouseReceipts[tokenId].active, WarehouseReceipts[tokenId].burnit);
    }

    // The following functions are overrides required by Solidity.
    // used to destroy the token by warehouse user
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    //This involves deployement of server and web integration, will be phase2 implementation boiler plate code
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    // provides in built functions to manage the roles in the smart and effective in managing multipe stakeholders
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
}
