### **Integrating the SDK in Your React Project**

1. Import the SDK in your React component:

   ```javascript
   import {ProductCard} from "prodembed-productitem-sdk";
   ```

2. Use the `EmbedCommerce` component to embed products:
   ```jsx
   <ProductCard
     apiKey="<dashboard api key>"
     merchantAddress="<merchants address>"
     productId="<product id>"
   />
   ```
