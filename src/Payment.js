import React, { useState, useEffect } from "react";
import "./Payment.css";
import { useStateValue } from "./StateProvider";
import CheckoutProduct from "./CheckoutProduct";
import { Link, useHistory } from "react-router-dom";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import CurrencyFormat from "react-currency-format";
import { getBasketTotal } from "./reducer";
import axios from "./axios";
import {db} from './firebase';

function Payment() {
  const history = useHistory();
  const [{ basket, user }, dispatch] = useStateValue();

  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState(null);
  const [disabled, setDisabled] = useState(true);
  const [client_secret, setClient_secret] = useState(true);

  useEffect(() => {
    //generate the special stripe secret which allows us to charge a customer

    const getClientSecret = async () => {
      const response = await axios({
        method: "post",
        //stripe expect the total in an currencies subunits
        url: `/payments/create?total=${getBasketTotal(basket) * 100}`,
      });

      setClient_secret(response.data.client_secret);
    };

    getClientSecret();
  }, [basket]);

  console.log("THE CLIENT SECRET IS >>>", client_secret);
  console.log("person" , user)

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);

    const payload = await stripe.confirmCardPayment(client_secret, {
        Payment_method: {
          card: elements.getElement(CardElement),
        },
      })
      .then(({ paymentIntent }) => {
        //paymentIntent = payment confirmation
         

        db.collection('users')
        .doc(user?.uid)
        .collection('orders')
        .doc(paymentIntent.id)
        .set({
          basket:basket,
          amount:paymentIntent.amount,
          created:paymentIntent.created
        })


        setSucceeded(true);
        setError(null);
        setProcessing(false);

        dispatch({
          type:"EMPTY_BASKET"
        })

        history.replace("./orders");
      });
  };
  const handleChange = (event) => {
    //Listen for changes in the card elements
    //and doisplay the error as the customer type their card elemnts
    setDisabled(event.empty);
    setError(event.error ? event.error.message : "");
  };

  return (
    <div className="payment">
      <div className="payment__conatiner">
        <h1>Checkout{<Link to="/checkout">({basket?.length} items)</Link>}</h1>

        {/* payment section -- delivery address*/}
        <div className="payment__section">
          <div className="payment__title">
            <h3>Delivery Address</h3>
          </div>
          <div className="payment__address">
            <p>{user?.email}</p>
            <p>Hirapur , Dhanbad</p>
            <p>Jharkhand , India</p>
          </div>
        </div>

        {/* payment section -- Review Items*/}
        <div className="payment__section">
          <div className="payment__title">
            <h3>Review the items and delivery</h3>
          </div>
          <div className="payment__items">
            {basket.map((item) => (
              <CheckoutProduct
                id={item.id}
                title={item.title}
                image={item.image}
                price={item.price}
                rating={item.rating}
              />
            ))}
          </div>
        </div>

        {/* payment section -- Payment method*/}
        <div className="payment__section">
          <div className="payment__title">
            <h3>Payemnt Method</h3>
          </div>
          <div className="payment__details">
            {/*stripe magic*/}
            <form onSubmit={handleSubmit}>
              <CardElement onChange={handleChange} />
              <div className="payment__priceContainer">
                <CurrencyFormat
                  renderText={(value) => <h1>Order Total: {value} </h1>}
                  decimalScale={2}
                  value={getBasketTotal(basket)}
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"$"}
                />
                <button disabled={processing || disabled || succeeded}>
                  <span>{processing ? <p>Processing</p> : "Buy Now"}</span>
                </button>
              </div>

              {/*error*/}
              {error && <div>{error}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payment;
