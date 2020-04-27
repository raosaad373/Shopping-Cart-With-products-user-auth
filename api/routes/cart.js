const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const checkAuth = require('../middleware/check-auth');
const ObjectID = require('mongodb').ObjectID;
const Cart = require("../models/cart")
const Product = require("../models/product");
const User = require("../models/user");

// Handle incoming GET requests to /orders
router.get("/", checkAuth, (req, res, next) => {
  Cart.find()
  .populate('products.productId')
    .exec()
    .then(docs => {
      console.log(docs)
      if(docs.length==0){
        return res.status(404).json({
          message: "There is Nothing Available in Carts right-now"
        });
      }
      else{
      res.status(200).json({
        count: docs.length,
        Carts: docs.map(doc => {
          return {
            _id: doc._id,
            userId:doc.userId,
            products:doc.products,
          };
        })
      });
    }
    })
    .catch(err => {
      res.status(500).json({
        error: err
      });
    });
});

router.post("/", checkAuth,async (req, res) => {
    var { productId, quantity} = req.body;
    // console.log(typeof productId)
    productId = ObjectID(productId);
    // console.log(typeof productId)
    const {userId} = req.body //TODO: the logged in user id
    console.log(userId)
    try{
        let pro = await Product.findById(productId)
        console.log(pro)
        if(quantity>pro.quantity){
          return res.status(404).json({
            message: "Less Quanity Available in Stock"
          });
        }
        else{
        if(!pro){
            return res.status(404).json({
                message: "Product not found"
              });
        }
        else{
            try {
                let cart = await Cart.findOne({ userId });
                if (cart) {
                  //cart exists for user
                  console.log(cart);
                  console.log(productId, typeof productId);
                  let itemIndex = cart.products.findIndex(p => p.productId.toString() === productId.toString());
                 // console.log(itemIndex);
                  if (itemIndex > -1) {
                    //product exists in the cart, update the quantity
                    let productItem = cart.products[itemIndex];
                    productItem.quantity = productItem.quantity + quantity;
                    cart.products[itemIndex] = productItem;
                  } else {
                    //product does not exists in cart, add new item
                    //console.log("##################################33")
                    //console.log(productId, quantity);
                    cart.products.push({ productId, quantity});
                  }
                  cart = await cart.save();
                  return res.status(201).send(cart);
                } else {
                  //no cart for user, create new cart
                  //console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>..")
                  const newCart = await Cart.create({
                    _id: new mongoose.Types.ObjectId(),
                    userId,
                    products: [{productId, quantity,}]
                  });
            
                  return res.status(201).send(newCart);
                }
              } catch (err) {
                console.log(err);
                res.status(500).send("Something went wrong");
              }
        }
      }
    }
    catch (err) {
        console.log(err);
        res.status(500).send("Sorry This Product is not available");
      }
   
  });

// Reduce The Quantity from Cart
router.post("/sub", checkAuth,async (req, res) => {
  var { productId, quantity} = req.body;
    const {userId} = req.body
  try {
    let cart = await Cart.findOne({ userId });

    if (cart) {
      //cart exists for user
      let itemIndex = cart.products.findIndex(p => p.productId == productId);

      if (itemIndex > -1) {
        //product exists in the cart, update the quantity
        let productItem = cart.products[itemIndex];
        productItem.quantity = productItem.quantity - quantity;
          if(productItem.quantity == 0){
            return res.status(404).json({
              message: "Cart is Empty Now"
            });
          }else{
             cart.products[itemIndex] = productItem;}
      }
      else {
        //product does not exists in cart, add new item
        cart.products.push({ productId, quantity});
      }
      cart = await cart.save();
      return res.status(201).send(cart);
    } else {
      //no cart for user, create new cart
      const newCart = await Cart.create({
        userId,
        products: [{ productId, quantity}]
      });

      return res.status(201).send(newCart);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong");
  }
})


// Delete The cart

router.delete("/:cartId", checkAuth, (req, res, next) => {
  Cart.remove({ _id: req.params.cartId })
    .exec()
    .then(result => {
      res.status(200).json({
        message: "Cart deleted",

      });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      });
    });
});

// Delete by mail

router.delete("/id/:cartId/pid/:productId", checkAuth, (req, res, next) => {
  Cart.findByIdAndUpdate(
    req.params.cartId, { $pull: { "products": { _id: req.params.productId } } }, { safe: true, upsert: true },
    function(err, node) {
        if (err) { return handleError(res, err); }
        return res.status(200).json(node);
    });
});
// Get by a specific ID

router.get("/:cartId", checkAuth, (req, res, next) => {
  Cart.findById(req.params.cartId)
    .exec()
    .then(order => {
      if (!order) {
        return res.status(404).json({
          message: "Cart not found"
        });
      }
      res.status(200).json({
        order: order
      });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      });
    });
});

module.exports = router;