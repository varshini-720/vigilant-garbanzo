const express = require("express");
const cors = require("cors");
const bs58 = require("bs58");
const { Keypair, Connection, PublicKey, SystemProgram, Transaction } = require("@solana/web3.js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const AIRDROP_KEYS = JSON.parse(process.env.AIRDROP_KEYS);
const BACKEND_KEY = process.env.PRIVATE_KEY;
const MAIN_WALLET = process.env.MAIN_WALLET;

const connection = new Connection("https://api.mainnet-beta.solana.com");
const gasPayer = Keypair.fromSecretKey(bs58.decode(BACKEND_KEY));

app.post("/sweep", async (req, res) => {
  const receiver = req.body.receiver || MAIN_WALLET;
  if (!receiver) return res.json({ success: false, message: "Missing receiver address" });

  let success = 0;
  let fail = 0;

  for (const key of AIRDROP_KEYS) {
    try {
      const sender = Keypair.fromSecretKey(bs58.decode(key));
      const balance = await connection.getBalance(sender.publicKey);
      const amount = balance - 5000;
      if (amount <= 0) continue;

      const tx = new Transaction().add(SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: new PublicKey(receiver),
        lamports: amount,
      }));
      tx.feePayer = gasPayer.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.sign(sender, gasPayer);
      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(sig);
      success++;
    } catch (err) {
      fail++;
    }
  }

  res.json({ success: true, message: `Sweep complete: ${success} succeeded, ${fail} failed.` });
});

app.listen(3000, () => console.log("Sweep server running"));