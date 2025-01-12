import {sepolia} from "@starknet-react/chains";
import {
  StarknetConfig,
  publicProvider,
  argent,
  braavos,
  useInjectedConnectors,
  voyager,
} from "@starknet-react/core";
import ProductCardComponent from "./Card";
import {FC} from "react";
interface ProductCardProps {
  merchantAddress: string;
  apiKey: string;
  productId: string;
}

export const ProductCard: FC<ProductCardProps> = ({
  merchantAddress,
  apiKey,
  productId,
}) => {
  const {connectors} = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [argent(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: "onlyIfNoConnectors",
    // Randomize the order of the connectors.
    order: "alphabetical",
  });

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={publicProvider()}
      connectors={connectors}
      explorer={voyager}
    >
      <ProductCardComponent
        merchantAddress={merchantAddress}
        apiKey={apiKey}
        productId={productId}
      />
    </StarknetConfig>
  );
};
