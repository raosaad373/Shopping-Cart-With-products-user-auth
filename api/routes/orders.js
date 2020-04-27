const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const checkAuth = require('../middleware/check-auth');

const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");

// Handle incoming GET requests to /orders
router.get("/", checkAuth, (req, res, next) => {
  Order.find()
  .select("userId products")
  .populate('product', 'name')
    .exec()
    .then(docs => {
      res.status(200).json({
        count: docs.length,
        orders: docs.map(doc => {
          return {
            _id: doc._id,
            product: doc.productId,
            userId:doc.userId,
            products:doc.products,
          };
        })
      });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      });
    });
});

router.post("/", checkAuth,async (req, res) => {
  const {userId, products: [{ productId, quantity, name, price }] } = req.body;

  try {
    let cart = await Order.findOne({ userId });

    if (cart) {
      //cart exists for user
      let itemIndex = cart.products.findIndex(p => p.productId == productId);

      if (itemIndex > -1) {
        //product exists in the cart, update the quantity
        let productItem = cart.products[itemIndex];
        productItem.quantity = quantity;
        cart.products[itemIndex] = productItem;
      } else {
        //product does not exists in cart, add new item
        cart.products.push({ productId, quantity, name, price });
      }
      cart = await cart.save();
      return res.status(201).send(cart);
    } else {
      //no cart for user, create new cart
      Product.findById(productId)
      .then(pro =>{
        if(!pro){
          return res.status(404).json({
            message: "Product not found"
          });
        }
        const newCart = Order.create({
          userId,
          products: [{ productId, quantity, name, price }]
        });
  
        return res.status(201).send(newCart);
      })
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Product not Found");
  }
});

router.patch("/:orderId", checkAuth, (req, res, next) => {
  // Validate Request
  if(!req.params.orderId) {
      return res.status(400).send({
          message: "Orders content can not be empty"
      });
  }

  // Find note and update it with the request body
  Order.findByIdAndUpdate(req.params.orderId, {
      products: [{
        productId:req.body.productId,
        quantity:req.body.quantity,
        name:req.body.name,
        price:req.body.price
      }]
  }, {new: true})
  .then(note => {
      if(!note) {
          return res.status(404).send({
              message: "Order not found with id " + req.params.orderId
          });
      }
      res.send('Order Updated');
  }).catch(err => {
      if(err.kind === 'OrderId') {
          return res.status(404).send({
              message: "Order not found with id " + req.params.orderId
          });                
      }
      return res.status(500).send({
          message: "Error updating Order with id " + req.params.orderId
      });
  });
});



router.delete("/:orderId", checkAuth, (req, res, next) => {
  Order.remove({ _id: req.params.orderId })
    .exec()
    .then(result => {
      res.status(200).json({
        message: "Order deleted",
        request: {
          type: "POST",
          url: "http://localhost:3000/orders",
          body: { productId: "ID", quantity: "Number" }
        }
      });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      });
    });
});

module.exports = router;