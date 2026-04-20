import React, { useEffect, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { IoSearchOutline } from "react-icons/io5";
import { TbCurrentLocation } from "react-icons/tb";
import { IoLocationSharp } from "react-icons/io5";
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useDispatch, useSelector } from 'react-redux';
import "leaflet/dist/leaflet.css"
import { setAddress, setLocation } from '../redux/mapSlice';
import { MdDeliveryDining } from "react-icons/md";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { addMyOrder } from '../redux/userSlice';

function RecenterMap({ location }) {
  if (location.lat && location.lon) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const map = useMap()
    map.setView([location.lat, location.lon], 16, { animate: true })
  }
  return null
}

function CheckOut() {
  const { location, address } = useSelector(state => state.map)
  const { cartItems, totalAmount, userData } = useSelector(state => state.user)

  const [addressInput, setAddressInput] = useState("")
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const apiKey = import.meta.env.VITE_GEOAPIKEY

  const deliveryFee = totalAmount > 500 ? 0 : 40
  const AmountWithDeliveryFee = totalAmount + deliveryFee

  const onDragEnd = (e) => {
    const { lat, lng } = e.target._latlng
    dispatch(setLocation({ lat, lon: lng }))
    getAddressByLatLng(lat, lng)
  }

  const getCurrentLocation = () => {
    const latitude = userData.location.coordinates[1]
    const longitude = userData.location.coordinates[0]
    dispatch(setLocation({ lat: latitude, lon: longitude }))
    getAddressByLatLng(latitude, longitude)
  }

  const getAddressByLatLng = async (lat, lng) => {
    try {
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${apiKey}`)
      dispatch(setAddress(result?.data?.results[0].address_line2))
    } catch (error) {
      console.log(error)
    }
  }

  const getLatLngByAddress = async () => {
    try {
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(addressInput)}&apiKey=${apiKey}`)
      const { lat, lon } = result.data.features[0].properties
      dispatch(setLocation({ lat, lon }))
    } catch (error) {
      console.log(error)
    }
  }

  const handlePlaceOrder = async () => {
    try {
      const result = await axios.post(`${serverUrl}/api/order/place-order`, {
        paymentMethod: "cod",   // 🔥 only COD now
        deliveryAddress: {
          text: addressInput,
          latitude: location.lat,
          longitude: location.lon
        },
        totalAmount: AmountWithDeliveryFee,
        cartItems
      }, { withCredentials: true })

      dispatch(addMyOrder(result.data))
      navigate("/order-placed")

    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    setAddressInput(address)
  }, [address])

  return (
    <div className='min-h-screen bg-[#fff9f6] flex items-center justify-center p-6'>
      <div className='absolute top-[20px] left-[20px]' onClick={() => navigate("/")}>
        <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
      </div>

      <div className='w-full max-w-[900px] bg-white rounded-2xl shadow-xl p-6 space-y-6'>
        <h1 className='text-2xl font-bold'>Checkout</h1>

        {/* LOCATION */}
        <section>
          <h2 className='text-lg font-semibold mb-2 flex items-center gap-2'>
            <IoLocationSharp /> Delivery Location
          </h2>

          <div className='flex gap-2 mb-3'>
            <input
              type="text"
              className='flex-1 border p-2 rounded'
              placeholder='Enter Address'
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
            />

            <button onClick={getLatLngByAddress}>
              <IoSearchOutline />
            </button>

            <button onClick={getCurrentLocation}>
              <TbCurrentLocation />
            </button>
          </div>

          <MapContainer center={[location?.lat, location?.lon]} zoom={16} className='h-64'>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RecenterMap location={location} />
            <Marker position={[location?.lat, location?.lon]} draggable eventHandlers={{ dragend: onDragEnd }} />
          </MapContainer>
        </section>

        {/* ORDER SUMMARY */}
        <section>
          <h2 className='text-lg font-semibold'>Order Summary</h2>

          {cartItems.map((item, index) => (
            <div key={index} className='flex justify-between'>
              <span>{item.name} x {item.quantity}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}

          <hr />

          <div>Subtotal: ₹{totalAmount}</div>
          <div>Delivery: {deliveryFee === 0 ? "Free" : deliveryFee}</div>
          <div>Total: ₹{AmountWithDeliveryFee}</div>
        </section>

        <button
          className='w-full bg-orange-500 text-white py-3 rounded'
          onClick={handlePlaceOrder}
        >
          Place Order
        </button>

      </div>
    </div>
  )
}

export default CheckOut