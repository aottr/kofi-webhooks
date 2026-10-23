export type KofiEventType = 'Donation' | 'Subscription' | 'Shop Order' | 'Commission';

export interface KofiShopItem {
  direct_link_code: string;
  variation_name: string;
  quantity: number;
}

export interface KofiShipping {
  full_name: string;
  street_address: string;
  city: string;
  state_or_province: string;
  postal_code: string;
  country: string;
  country_code: string;
  telephone: string;
}

interface KofiBase {
  verification_token: string;
  message_id: string;
  timestamp: string;
  is_public: boolean;
  from_name: string;
  message: string | null;
  /** Decimal string, e.g. "3.00" */
  amount: string;
  url: string;
  email: string;
  currency: string;
  kofi_transaction_id: string;
  /** Set when the supporter linked their Discord account to Ko-fi. */
  discord_username?: string | null;
  /** Set when the supporter linked their Discord account to Ko-fi. */
  discord_userid?: string | null;
}

export interface KofiDonation extends KofiBase {
  type: 'Donation';
  is_subscription_payment: false;
  is_first_subscription_payment: false;
  shop_items: null;
  tier_name: null;
  shipping: null;
}

export interface KofiSubscription extends KofiBase {
  type: 'Subscription';
  is_subscription_payment: true;
  is_first_subscription_payment: boolean;
  tier_name: string | null;
  shop_items: null;
  shipping: null;
}

export interface KofiShopOrder extends KofiBase {
  type: 'Shop Order';
  shop_items: KofiShopItem[];
  shipping: KofiShipping | null;
  is_subscription_payment: boolean;
  is_first_subscription_payment: boolean;
  tier_name: string | null;
}

export interface KofiCommission extends KofiBase {
  type: 'Commission';
  shop_items: KofiShopItem[] | null;
  shipping: KofiShipping | null;
  is_subscription_payment: boolean;
  is_first_subscription_payment: boolean;
  tier_name: string | null;
}

export type KofiEvent = KofiDonation | KofiSubscription | KofiShopOrder | KofiCommission;

export interface KofiEventMap {
  donation: KofiDonation;
  subscription: KofiSubscription;
  shopOrder: KofiShopOrder;
  commission: KofiCommission;
  /** Fires for every verified event, after the specific handlers. */
  event: KofiEvent;
}
