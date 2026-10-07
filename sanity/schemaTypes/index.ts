import { type SchemaTypeDefinition } from 'sanity'
import { brandType } from './brandType'
import { categoryType } from './categoryType'
import { customerType } from './customerType'
import { orderType } from './orderType'
import { productType } from './productType'
import { promotionType } from './promotionType'
import { restockSubscriptionType } from './restockSubscriptionType'
import { wishlistItemType } from './wishlistItemType'
import { shippingSettingsType } from './shippingSettingsType'
import { returnRequestType } from './returnRequestType'
import { shoppingCartType } from './shoppingCartType'

  
export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    brandType,
    categoryType,
    customerType,
    orderType,
    productType,
    promotionType,
    restockSubscriptionType,
    wishlistItemType,
    shippingSettingsType,
    returnRequestType,
    shoppingCartType,
  ],
}
