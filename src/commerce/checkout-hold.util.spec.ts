import {

  isBlockedByOtherCheckoutHold,

  isCheckoutHoldActive,

} from './checkout-hold.util';



describe('checkout-hold.util', () => {

  const future = new Date(Date.now() + 60_000);

  const past = new Date(Date.now() - 60_000);



  it('isCheckoutHoldActive is false when missing ids', () => {

    expect(isCheckoutHoldActive(future, null, null)).toBe(false);

    expect(isCheckoutHoldActive(null, 'ord1', null)).toBe(false);

  });



  it('isCheckoutHoldActive is true for future expiry with order id', () => {

    expect(isCheckoutHoldActive(future, 'ord1', null)).toBe(true);

  });



  it('isCheckoutHoldActive is true for future expiry with payment id only', () => {

    expect(isCheckoutHoldActive(future, null, 'pay1')).toBe(true);

  });



  it('isBlockedByOtherCheckoutHold respects excludingOrderId', () => {

    expect(

      isBlockedByOtherCheckoutHold(future, 'ord1', null, {

        orderId: 'ord1',

      }),

    ).toBe(false);

    expect(

      isBlockedByOtherCheckoutHold(future, 'ord1', null, {

        orderId: 'ord2',

      }),

    ).toBe(true);

    expect(

      isBlockedByOtherCheckoutHold(past, 'ord1', null, undefined),

    ).toBe(false);

  });



  it('isBlockedByOtherCheckoutHold respects excludingPaymentId', () => {

    expect(

      isBlockedByOtherCheckoutHold(future, null, 'pay1', {

        paymentId: 'pay1',

      }),

    ).toBe(false);

    expect(

      isBlockedByOtherCheckoutHold(future, null, 'pay1', {

        paymentId: 'pay2',

      }),

    ).toBe(true);

  });

});

