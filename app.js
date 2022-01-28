const fs = require("fs");
const express = require("express");
const app = express();
const sequelize = require("./util/database");

const Users = require("./models/users");
const Shares = require("./models/shares");
const User_shares = require("./models/user_shares");

app.use(express.json());

app.post("/users", async (req, res) => {
  const { portfolio } = req.body;
  try {
    const user = await Users.create({ portfolio });

    return res.json(user);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

app.post("/shares", async (req, res) => {
  const { name, rate } = req.body;

  try {
    const share = await Shares.create({ name, rate });

    return res.json(share);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

app.post("/user_share", async (req, res) => {
  const { userId, shareId, quantity, onSale } = req.body;
  await User_shares.create({
    quantity,
    userId,
    shareId,
    onSale: onSale ? onSale : false,
  });
});

app.post("/buy", async (req, res) => {
  const { user_id, shareName, quantity } = req.body;
  try {
    const user = await Users.findOne({ where: { id: user_id } });

    const share = await Shares.findOne({ where: { name: shareName } });

    if (!user) {
      return res.status(400).json("this user does not registered");
    }

    if (!share) {
      return res.status(400).json("this share does not registered");
    }

    if (user.portfolio === false) {
      return res.status(400).json("user does not have a registered portfolio");
    }

    const user_shares = await User_shares.findAll({
      where: [{ shareId: share.id }, { onSale: true }],
    });

    // filtering for not counting users shares who is buying
    const filtered_user_shares = user_shares.filter(
      (user_share) => user_share.userId !== user.id
    );

    if (filtered_user_shares.length < 1) {
      return res.status(400).json("there is not that much share in the market");
    }

    //filtering the share if user already have some to use later
    const buyer_user_shares = user_shares.filter(
      (user_share) =>
        user_share.userId === user.id && user_share.onSale === false
    );

    // counting totalQuantity of the share in the market
    const totalQuantity = filtered_user_shares.reduce((a, b) => ({
      quantity: a.quantity + b.quantity,
    }));

    if (totalQuantity.quantity < quantity) {
      return res.status(400).json("there is not that much share in the market");
    }

    let tempQuantity = quantity;

    let newQuantities = [];

    // buy operation
    for (let i = 0; i < filtered_user_shares.length; i++) {
      let boughtQuantity = 0;
      if (tempQuantity === 0) {
        break;
      }
      if (filtered_user_shares[i].quantity >= tempQuantity) {
        newQuantities.push(filtered_user_shares[i].quantity - tempQuantity);
        boughtQuantity = tempQuantity;
        tempQuantity = 0;
      } else if (filtered_user_shares[i].quantity < tempQuantity) {
        newQuantities.push(0);
        boughtQuantity = filtered_user_shares[i].quantity;
        tempQuantity = tempQuantity - filtered_user_shares[i].quantity;
      }
      fs.appendFile(
        "./logs.txt",
        `\n ${boughtQuantity} ${shareName} bought by user ${user.id} at the rate of ${share.rate} from user ${filtered_user_shares[i].userId}`,
        { flags: "wx" },
        (err) => {
          if (err) {
            console.error(err);
            return;
          }
        }
      );
    }

    //updating user_shares
    for (let i = 0; i < filtered_user_shares.length; i++) {
      //if quantity is 0 just delete the row
      if (newQuantities[i] === 0) {
        await User_shares.destroy({
          where: {
            id: filtered_user_shares[i].id,
          },
        });
      } else {
        //else update it with the new quantity
        await User_shares.update(
          { quantity: newQuantities[i] },
          {
            where: {
              id: filtered_user_shares[i].id,
            },
          }
        );
      }
    }

    //update the users profile itself
    if (buyer_user_shares.length > 0) {
      await User_shares.update(
        { quantity: buyer_user_shares[0].quantity + quantity },
        {
          where: {
            id: buyer_user_shares[0].id,
          },
        }
      );
    } else {
      await User_shares.create({
        quantity: quantity,
        userId: user.id,
        shareId: share.id,
        onSale: false,
      });
    }

    return res.json("successfull");
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

app.post("/sell", async (req, res) => {
  const { user_id, shareName, quantity } = req.body;
  try {
    const user = await Users.findOne({ where: { id: user_id } });

    const share = await Shares.findOne({ where: { name: shareName } });

    if (!user) {
      return res.status(400).json("this user does not registered");
    }

    if (!share) {
      return res.status(400).json("this share does not registered");
    }

    if (user.portfolio === false) {
      return res.status(400).json("user does not have a registered portfolio");
    }

    // user shares not for sale
    const user_shares = await User_shares.findAll({
      where: [{ shareId: share.id }, { userId: user.id }, { onSale: false }],
    });

    // user shares onSale
    const user_shares_onSale = await User_shares.findAll({
      where: [{ shareId: share.id }, { userId: user.id }, { onSale: true }],
    });

    if (user_shares.length < 1) {
      return res.status(400).json("user does not have share to sell");
    } else if (user_shares[0].quantity < quantity) {
      return res.status(400).json("user does not have that much share to sell");
    }

    if (user_shares[0].quantity > quantity) {
      // update
      await User_shares.update(
        { quantity: user_shares[0].quantity - quantity },
        {
          where: {
            id: user_shares[0].id,
          },
        }
      );
    } else {
      //delete
      await User_shares.destroy({
        where: {
          id: user_shares[0].id,
        },
      });
    }

    // add new one if there is not  onSale
    if (user_shares_onSale.length > 0) {
      await User_shares.update(
        { quantity: user_shares_onSale[0].quantity + quantity },
        {
          where: {
            id: user_shares_onSale[0].id,
          },
        }
      );
    } else {
      await User_shares.create({
        quantity,
        userId: user.id,
        shareId: share.id,
        onSale: true,
      });
    }

    return res.json("succesfull");
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
});

app.listen({ port: 5000 }, async () => {
  console.log("Server up on http://localhost:5000");
  await sequelize.authenticate();
  console.log("Database Connected!");
});
