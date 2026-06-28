# IVR Refill Ordering

## Current MVP Flow

Phase 1 supports DTMF IVR refill ordering through a backend webhook. This is not an AI voice agent.

1. Customer calls the TOP-R Water IVR number.
2. IVR plays prerecorded prompts.
3. Customer selects refill quantity with keypad digits.
4. IVR provider sends caller phone and selected quantity to `POST /ivr/order`.
5. Backend normalizes the phone number and finds the customer.
6. Backend uses the customer's default address and active 20L jar subscription.
7. Backend creates a refill order with Cash on Delivery.
8. Order appears in Admin Orders and follows the normal delivery workflow.
9. Customer sees the refill order in All Orders and Order Tracking.

## Prerequisites

- Caller phone must match a row in `public.users.phone`.
- Customer must have one default address in `public.addresses`.
- Customer must have an active `20l-ro-jar` subscription.
- Quantity must be between 1 and 5.
- Quantity must not exceed the customer's subscribed jar count.

## Sample Prerecorded Prompts

Welcome to TOP-R Water.

To order 20 liter jar refill, press 1.
For support, press 2.

Please select number of jars.
Press 1 for one jar.
Press 2 for two jars.
Press 3 for three jars.
Press 4 for four jars.
Press 5 for five jars.

You selected [X] jars.
Press 1 to confirm.
Press 2 to cancel.

Thank you. Your refill order has been placed. Our delivery team will contact you soon.

## Webhook Endpoint

```text
POST /ivr/order
Content-Type: application/json
```

Primary payload:

```json
{
  "callerPhone": "+919999999999",
  "quantity": 2,
  "callId": "provider-call-id"
}
```

Accepted alternate provider fields:

- Phone: `callerPhone`, `caller`, `from`, `phone`
- Quantity: `quantity`, `digits`, `Digits`
- Call id: `callId`, `CallSid`, `call_id`

Phone normalization supports:

- `+91XXXXXXXXXX`
- `91XXXXXXXXXX`
- `XXXXXXXXXX`, converted to `+91XXXXXXXXXX`

## Success Response

```json
{
  "ok": true,
  "message": "IVR refill order created",
  "order": {
    "id": "order-id",
    "type": "refill",
    "status": "Placed",
    "source": "ivr",
    "quantity": 2,
    "total_amount": 80,
    "payment_method": "cash_on_delivery",
    "payment_status": "pending"
  }
}
```

## cURL Tests

Local server:

```bash
curl -X POST http://localhost:4000/ivr/order \
  -H "Content-Type: application/json" \
  -d '{"callerPhone":"+919999999999","quantity":2,"callId":"test-call-001"}'
```

Railway server:

```bash
curl -X POST https://top-rappbase-production.up.railway.app/ivr/order \
  -H "Content-Type: application/json" \
  -d '{"callerPhone":"+919999999999","quantity":2,"callId":"test-call-001"}'
```

Provider-style payload:

```bash
curl -X POST http://localhost:4000/ivr/order \
  -H "Content-Type: application/json" \
  -d '{"from":"9999999999","Digits":"2","CallSid":"twilio-test-call"}'
```

Health check:

```bash
curl http://localhost:4000/ivr/health
```

## Error Cases

Missing or invalid phone:

```json
{
  "ok": false,
  "code": "CALLER_PHONE_REQUIRED",
  "error": "callerPhone is required and must be an Indian mobile number"
}
```

Missing quantity:

```json
{
  "ok": false,
  "code": "QUANTITY_REQUIRED",
  "error": "quantity is required"
}
```

Invalid quantity:

```json
{
  "ok": false,
  "code": "INVALID_QUANTITY",
  "error": "quantity must be between 1 and 5"
}
```

Unknown caller:

```json
{
  "ok": false,
  "code": "USER_NOT_FOUND",
  "error": "No customer found for this caller phone"
}
```

No default address:

```json
{
  "ok": false,
  "code": "DEFAULT_ADDRESS_REQUIRED",
  "error": "Customer must have a default delivery address"
}
```

No active subscription:

```json
{
  "ok": false,
  "code": "ACTIVE_SUBSCRIPTION_REQUIRED",
  "error": "Customer needs an active 20L jar subscription for refill orders"
}
```

If quantity exceeds jars owned, the backend returns the existing refill validation error.

## Order Fields

IVR orders are stored in `public.orders` with:

- `type = refill`
- `status = Placed`
- `source = ivr`
- `payment_method = cash_on_delivery`
- `payment_status = pending`
- `caller_phone = normalized caller phone`
- `ivr_call_id = provider call id when available`
- `total_amount = quantity * 40`

## Future Provider Notes

- Connect the purchased IVR number to `POST /ivr/order`.
- Configure DTMF menu confirmation before the webhook call.
- Store raw provider payloads in a separate audit table if call debugging becomes important.
- Add webhook signature verification once the provider is selected.
- Consider idempotency by `ivr_call_id` if the provider retries webhooks.
- Consider SMS or WhatsApp confirmation after order creation.
