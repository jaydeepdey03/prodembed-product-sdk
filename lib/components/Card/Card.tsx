import React, {useEffect, useMemo, useRef, useState} from "react";
import {ethers} from "ethers";
import {ethereumAbi} from "./ethereumAbi";
import {
  useAccount,
  useConnect,
  useContract,
  useSendTransaction,
} from "@starknet-react/core";
import {starknetAbi} from "./starknetAbi";
import {toast, Toaster} from "sonner";

interface ProductCardComponentProps {
  merchantAddress: string;
  apiKey: string;
  productId: string;
}

declare global {
  interface Window {
    ethereum: any;
  }
}

export const ProductCardComponent: React.FC<ProductCardComponentProps> = ({
  merchantAddress,
  apiKey,
  productId,
}) => {
  const dialogRef1 = useRef<HTMLDialogElement>(null);
  const dialogRef2 = useRef<HTMLDialogElement>(null);

  const openDialogEthereum = () => dialogRef1.current?.showModal();
  const closeDialogEthereum = () => dialogRef1.current?.close();

  const openDialogStarknet = () => dialogRef2.current?.showModal();
  const closeDialogStarknet = () => dialogRef2.current?.close();

  const {address} = useAccount();
  const contractAddress = "0x437d598258525Fb52Ca31A2259624e43472AEbdE";

  const {ethereum} = window;

  const [ethereumAccount, setEthereumAccount] = useState("");
  const [chainId, setChainId] = useState("");

  const {connect, connectors} = useConnect();

  useEffect(() => {
    if (ethereum) {
      ethereum.on("accountsChanged", (accounts: any) => {
        setEthereumAccount(accounts[0]);
      });
    } else console.log("No metamask!");

    return () => {
      // ethereum.removeListener('accountsChanged');
    };
  }, [ethereum]);

  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        if (!ethereum) {
          console.log("Metamask not found");
          return;
        } else console.log("we have etherium object");

        const accounts = await ethereum.request({method: "eth_accounts"}); //check if there are accounts connected to the site

        if (accounts.length !== 0) {
          const account = accounts[0];
          console.log("Found an authorized account:", account);
          // if (ethereumAccount !== "")
          setEthereumAccount(account);

          // votingSystem();
        } else {
          setEthereumAccount("");
          console.log("No authorized accounts found!");
        }

        const curr_chainId = await ethereum.request({method: "eth_chainId"});
        setChainId(curr_chainId);

        ethereum.on("chainChanged", () => {
          window.location.reload();
        });
      } catch (error) {
        console.log(error);
      }
    };

    checkIfWalletIsConnected();
  }, [ethereumAccount, ethereum]);

  const [etheruemContract, setEthereumContract] = useState<ethers.Contract>();

  useEffect(() => {
    (async function () {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        contractAddress,
        ethereumAbi,
        signer
      );

      setEthereumContract(contract);
    })();
  }, [ethereumAccount]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({method: "eth_requestAccounts"}); // request connection with accounts
      // console.log("Connected", accounts[0]);
      setEthereumAccount(accounts[0]);
      // const chainId = await ethereum.request({ method: 'eth_chainId' });
    } catch (e) {
      console.log(e);
    }
  };

  const switchNetwork = async (chainId: string) => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{chainId}], // Check networks.js for hexadecimal network ids
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (chainId !== "0x13fb") {
      switchNetwork("0x13fb");
    }
  }, [chainId, ethereumAccount]);

  console.log(ethereumAccount, "ethereumAccount");

  const [data, setData] = useState<any>(null);
  const [merchantInfo, setMerchantInfo] = useState<any>(null);

  useEffect(() => {
    if (!etheruemContract) return;
    (async function () {
      const wallet = ethers.Wallet.createRandom();

      // 2. Connect the wallet to a provider
      const provider = new ethers.providers.JsonRpcProvider(
        "https://rpc.testnet.citrea.xyz" // Replace with your provider
      );

      const connectedWallet = wallet.connect(provider);

      const contract = new ethers.Contract(
        contractAddress,
        ethereumAbi,
        connectedWallet
      );

      if (merchantAddress && apiKey && productId) {
        const val = await contract.getProductDetails(
          merchantAddress,
          apiKey,
          productId
        );

        const val1 = await contract.getDashboardDetails(
          merchantAddress,
          apiKey
        );
        setData(val);
        setMerchantInfo(val1);
        console.log(val, "val");
      }

      const val = await etheruemContract.getPurchaseHistory(
        merchantAddress,
        apiKey
      );
      console.log(val, "purchasehistory");
    })();

    // console.log(contract, "contract");
  }, [etheruemContract, merchantAddress, apiKey, productId]);

  const payWithEthereum = async (to: string, value: number) => {
    // if not connected to metamask and no ethereum
    if (!ethereum || !ethereumAccount || !etheruemContract || !merchantAddress)
      return;

    const erc20Abi = [
      "function transfer(address to, uint256 amount) public returns (bool)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address account) view returns (uint256)",
    ];

    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();

    const tokenContract = new ethers.Contract(
      "0xB6Ba2bf473288D1023a6c21d414deE817597db0f",
      erc20Abi,
      signer
    );

    try {
      try {
        toast.loading("Processing payment...");
        const tx = await tokenContract.transfer(to, BigInt(value));
        await tx.wait();

        toast.success("Payment successful!");

        toast.loading("Adding purchase to history...");

        const tx1 = await etheruemContract.purchaseProduct(
          merchantAddress,
          apiKey,
          productId,
          1,
          Number(data.price._hex)
        );

        await tx1.wait();

        const val = await etheruemContract.getPurchaseHistory(
          merchantAddress,
          apiKey
        );
        console.log(val, "purchasehistory");

        toast.success("Purchase added to history!");

        dialogRef2.current?.close();
      } catch (error) {
        toast.error("Payment failed!");
      } finally {
        toast.dismiss();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const testAddress =
    "0x060fce01d8a9a6e7c5a16d5fd97a336795b67f89cbbbcfa4ad1b28136ae46ed8";

  const {contract} = useContract({
    abi: starknetAbi as any,
    address: testAddress,
  });

  const calls = useMemo(() => {
    if (!address || !contract || !data) return [];
    try {
      console.log("contract", contract);
      // return [contract.populate("set_count", [BigInt(679)])];
      return [
        contract.populate("transfer", [
          merchantAddress,
          Number(data.price._hex),
        ]),
      ];
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [contract, address]);

  const {sendAsync} = useSendTransaction({
    calls: calls,
  });

  return (
    <div style={styles.container}>
      <Toaster />
      <div
        style={{
          ...styles.card,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "0",
            right: "0",
            zIndex: -1,
            transform: "translate(5px, 5px)",
            width: "100%",
            height: "100%",
            backgroundColor: "gray",
            borderRadius: "8px",
          }}
        />

        <img
          src={
            data
              ? `https://ipfs.io/ipfs/${data.productImage}`
              : "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM="
          }
          alt="Product"
          style={styles.image}
        />
        <h2 style={styles.title}>{data?.name}</h2>
        <p style={styles.price}>
          {Number(
            data &&
              data.price &&
              ethers.utils.formatEther(Number(data.price._hex))
          )}
          &nbsp;USDC
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
            marginTop: "0",
            gap: "10px",
          }}
        >
          {data && data.isStarknet && (
            <button
              style={{
                ...styles.button,
                gap: "8px",
              }}
              onClick={openDialogStarknet}
            >
              <img
                // src="../lib/assets/starknet.svg"
                src="https://pbs.twimg.com/profile_images/1656626983617323010/xzIYc6hK_400x400.png"
                alt="starknet"
                className="h-4 w-4"
                style={{
                  height: "1rem",
                  width: "1rem",
                }}
              />
              <span>Pay with Starknet</span>
            </button>
          )}

          {data && data.isEthereum && (
            <button
              style={{
                ...styles.button,
                gap: "8px",
              }}
              onClick={openDialogEthereum}
            >
              <img
                // src="../lib/assets/ethereum.png"
                src="https://images.seeklogo.com/logo-png/44/2/ethereum-eth-logo-png_seeklogo-444507.png"
                alt="starknet"
                className="h-4 w-4"
                style={{
                  height: "1rem",
                  width: "1rem",
                }}
              />
              <span>Pay with Eth</span>
            </button>
          )}
        </div>
      </div>

      <dialog ref={dialogRef1} style={styles.dialog}>
        <div style={styles.dialogContent}>
          <button style={styles.closeDialogBtn} onClick={closeDialogEthereum}>
            &times;
          </button>
          <h2 style={styles.heading}>{"Pay in Citrea"}</h2>
          <img
            src={
              merchantInfo && merchantInfo[3]
                ? "https://gateway.ipfs.io/ipfs/" + merchantInfo[3]
                : // merchantInfo[3]
                  "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM="
            }
            alt={`${"merchantInfo.name"} logo`}
            style={styles.merchantImage}
          />
          {ethereumAccount ? (
            <button
              onClick={async () => {
                await payWithEthereum(merchantAddress, Number(data.price._hex));
              }}
              style={styles.button}
            >
              Pay {data && ethers.utils.formatEther(Number(data.price._hex))}{" "}
              USDC
            </button>
          ) : (
            <button onClick={connectWallet} style={styles.paymentBtn}>
              Connect Wallet
            </button>
          )}
        </div>
      </dialog>

      <dialog ref={dialogRef2} style={styles.dialog}>
        <div style={styles.dialogContent}>
          <button style={styles.closeDialogBtn} onClick={closeDialogStarknet}>
            &times;
          </button>
          <h2 style={styles.heading}>{"Pay with Starknet"}</h2>
          <img
            src={
              merchantInfo
                ? "https://gateway.ipfs.io/ipfs/" + merchantInfo[3]
                : "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM="
            }
            alt={`${"merchantInfo.name"} logo`}
            style={styles.merchantImage}
          />
          {address ? (
            <button
              onClick={async () => {
                if (!etheruemContract) return;

                try {
                  toast.loading("Processing payment...");
                  await sendAsync();

                  toast.success("Payment successful!");

                  toast.loading("Adding purchase to history...");

                  const tx1 = await etheruemContract.purchaseProduct(
                    merchantAddress,
                    apiKey,
                    productId,
                    1,
                    Number(data.price._hex)
                  );

                  await tx1.wait();

                  toast.success("Purchase added to history!");

                  dialogRef2.current?.close();

                  const val = await etheruemContract.getPurchaseHistory(
                    merchantAddress,
                    apiKey
                  );
                  console.log(val, "purchasehistory");
                } catch (error) {
                  console.log(error);

                  toast.error("Payment failed!");
                } finally {
                  toast.dismiss();
                }
              }}
              style={styles.button}
            >
              Pay {data && ethers.utils.formatEther(Number(data.price._hex))}{" "}
              USDC
            </button>
          ) : (
            <button
              onClick={() =>
                connect({
                  connector: connectors[0],
                })
              }
              style={styles.paymentBtn}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </dialog>
    </div>
  );
};

const styles: {[key: string]: React.CSSProperties} = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "375px",
    // maxWidth: "100%",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "24px",
    border: "2px solid black",
  },
  image: {
    width: "100%",
    height: "250px",
    objectFit: "contain",
    marginBottom: "16px",
    borderRadius: "4px",
    // border: "1px solid black",
  },
  title: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "8px",
  },
  price: {
    fontSize: "24px",
    fontWeight: "700",
    marginTop: "10px",
    marginBottom: "20px",
  },
  button: {
    width: "100%",
    padding: "10px",
    backgroundColor: "transparent",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
  },
  icon: {
    width: "16px",
    height: "16px",
    marginRight: "8px",
  },
  dialog: {
    padding: 0,
    border: "none",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  dialogContent: {
    padding: "20px",
    maxWidth: "400px",
    width: "100%",
    position: "relative",
  },
  closeDialogBtn: {
    position: "absolute",
    top: "10px",
    right: "10px",
    fontSize: "24px",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  heading: {
    marginTop: "0",
  },
  merchantImage: {
    display: "block",
    margin: "20px auto",
    maxWidth: "100%",
    height: "auto",
  },
  accountAddress: {
    margin: "10px 0",
    wordBreak: "break-all",
  },
  paymentBtn: {
    display: "block",
    width: "100%",
    padding: "10px",
    fontSize: "16px",
    backgroundColor: "#008CBA",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginTop: "20px",
  },
};

export default ProductCardComponent;
