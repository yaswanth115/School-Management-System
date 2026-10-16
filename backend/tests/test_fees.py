import uuid
from decimal import Decimal
from app.core.config import settings
from app.models.fee import InvoiceStatus, PaymentMethod, PaymentStatus


def test_list_and_create_fee_types(client, accountant_headers):
    # List fee types
    resp = client.get(f"{settings.API_V1_STR}/fees/types", headers=accountant_headers)
    assert resp.status_code == 200
    types = resp.json()
    assert len(types) >= 5
    assert any(t["code"] == "TUIT" for t in types)

    # Create new fee type
    suffix = uuid.uuid4().hex[:4].upper()
    create_payload = {
        "name": f"Technology Fee {suffix}",
        "code": f"TECH-{suffix}",
        "description": "IT infrastructure and coding lab fee",
    }
    create_resp = client.post(
        f"{settings.API_V1_STR}/fees/types",
        headers=accountant_headers,
        json=create_payload,
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["code"] == f"TECH-{suffix}"
    assert created["is_active"] is True


def test_list_and_create_fee_structure(client, accountant_headers):
    # Fetch academic year & class
    years_resp = client.get(f"{settings.API_V1_STR}/academics/years", headers=accountant_headers)
    curr_year = next(y for y in years_resp.json() if y["is_current"])

    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=accountant_headers)
    grade_9 = next(c for c in classes_resp.json() if c["name"] == "Grade 9")

    # Fetch fee types
    types_resp = client.get(f"{settings.API_V1_STR}/fees/types", headers=accountant_headers)
    tuition_type = next(t for t in types_resp.json() if t["code"] == "TUIT")
    exam_type = next(t for t in types_resp.json() if t["code"] == "EXAM")

    payload = {
        "academic_year_id": curr_year["id"],
        "class_id": grade_9["id"],
        "name": "Grade 9 Annual Fee 2026-2027",
        "due_date": "2026-09-30",
        "items": [
            {"fee_type_id": tuition_type["id"], "amount": 18000.00},
            {"fee_type_id": exam_type["id"], "amount": 2500.00},
        ],
    }
    create_resp = client.post(
        f"{settings.API_V1_STR}/fees/structures",
        headers=accountant_headers,
        json=payload,
    )
    assert create_resp.status_code == 201
    struct = create_resp.json()
    assert float(struct["total_amount"]) == 20500.00
    assert len(struct["items"]) == 2


def test_get_seeded_invoice_details(client, accountant_headers):
    # List invoices
    resp = client.get(f"{settings.API_V1_STR}/fees/invoices", headers=accountant_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1

    sample_inv = next(i for i in data["items"] if i["invoice_number"] == "INV-2026-0001")
    assert sample_inv["admission_number"] == "ADM-2026-0001"
    assert float(sample_inv["total_amount"]) == 30000.00
    assert float(sample_inv["paid_amount"]) == 10000.00
    assert float(sample_inv["balance_amount"]) == 20000.00
    assert sample_inv["status"] == "PARTIALLY_PAID"

    # Detail endpoint
    detail_resp = client.get(
        f"{settings.API_V1_STR}/fees/invoices/{sample_inv['id']}",
        headers=accountant_headers,
    )
    assert detail_resp.status_code == 200
    details = detail_resp.json()
    assert len(details["items"]) == 4
    assert len(details["payments"]) == 1
    assert details["payments"][0]["receipt_number"] == "REC-2026-0001"


def test_payment_collection_workflow(client, accountant_headers):
    # 1. Fetch the invoice
    inv_resp = client.get(f"{settings.API_V1_STR}/fees/invoices", headers=accountant_headers)
    sample_inv = next(i for i in inv_resp.json()["items"] if i["invoice_number"] == "INV-2026-0001")
    inv_id = sample_inv["id"]
    initial_balance = float(sample_inv["balance_amount"])

    # 2. Overpayment rejection test (trying to pay more than balance)
    overpay_resp = client.post(
        f"{settings.API_V1_STR}/fees/payments/collect",
        headers=accountant_headers,
        json={
            "invoice_id": inv_id,
            "amount": initial_balance + 5000.00,
            "payment_method": "CASH",
        },
    )
    assert overpay_resp.status_code == 400
    assert "exceeds outstanding balance" in overpay_resp.json()["detail"]

    # 3. Successful partial payment: pay 5000
    pay_resp = client.post(
        f"{settings.API_V1_STR}/fees/payments/collect",
        headers=accountant_headers,
        json={
            "invoice_id": inv_id,
            "amount": 5000.00,
            "payment_method": "BANK_TRANSFER",
            "transaction_reference": "TXN-BANK-11029",
            "notes": "Second installment via bank",
        },
    )
    assert pay_resp.status_code == 201
    pay_data = pay_resp.json()
    assert float(pay_data["amount"]) == 5000.00
    assert pay_data["receipt_number"].startswith("REC-")
    assert pay_data["status"] == "COMPLETED"

    # Verify updated invoice status
    inv_check = client.get(f"{settings.API_V1_STR}/fees/invoices/{inv_id}", headers=accountant_headers).json()
    assert float(inv_check["paid_amount"]) == 15000.00
    assert float(inv_check["balance_amount"]) == 15000.00
    assert inv_check["status"] == "PARTIALLY_PAID"

    # 4. Full payment: pay remaining 15000
    pay2_resp = client.post(
        f"{settings.API_V1_STR}/fees/payments/collect",
        headers=accountant_headers,
        json={
            "invoice_id": inv_id,
            "amount": 15000.00,
            "payment_method": "UPI",
            "transaction_reference": "UPI-SETTLED-9988",
        },
    )
    assert pay2_resp.status_code == 201

    # Verify invoice is now PAID
    inv_check2 = client.get(f"{settings.API_V1_STR}/fees/invoices/{inv_id}", headers=accountant_headers).json()
    assert float(inv_check2["paid_amount"]) == 30000.00
    assert float(inv_check2["balance_amount"]) == 0.00
    assert inv_check2["status"] == "PAID"

    # 5. Further payment on fully paid invoice should be rejected
    fully_paid_resp = client.post(
        f"{settings.API_V1_STR}/fees/payments/collect",
        headers=accountant_headers,
        json={
            "invoice_id": inv_id,
            "amount": 100.00,
            "payment_method": "CASH",
        },
    )
    assert fully_paid_resp.status_code == 400
    assert "already fully paid" in fully_paid_resp.json()["detail"]

    # 6. Refund workflow: refund 5000 from the second payment
    refund_resp = client.post(
        f"{settings.API_V1_STR}/fees/payments/{pay_data['id']}/refund",
        headers=accountant_headers,
        json={
            "amount": 5000.00,
            "reason": "Administrative fee waiver adjustment",
        },
    )
    assert refund_resp.status_code == 201
    ref_data = refund_resp.json()
    assert ref_data["refund_number"].startswith("REF-")
    assert float(ref_data["amount"]) == 5000.00

    # Invoice balance should have reversed to 5000
    inv_check3 = client.get(f"{settings.API_V1_STR}/fees/invoices/{inv_id}", headers=accountant_headers).json()
    assert float(inv_check3["balance_amount"]) == 5000.00
    assert float(inv_check3["paid_amount"]) == 25000.00
    assert inv_check3["status"] == "PARTIALLY_PAID"


def test_bulk_class_invoice_generation(client, accountant_headers):
    # Fetch academic year & Grade 10
    years_resp = client.get(f"{settings.API_V1_STR}/academics/years", headers=accountant_headers)
    curr_year = next(y for y in years_resp.json() if y["is_current"])

    classes_resp = client.get(f"{settings.API_V1_STR}/academics/classes", headers=accountant_headers)
    grade_10 = next(c for c in classes_resp.json() if c["name"] == "Grade 10")

    structs_resp = client.get(
        f"{settings.API_V1_STR}/fees/structures?class_id={grade_10['id']}",
        headers=accountant_headers,
    )
    assert structs_resp.status_code == 200
    struct = structs_resp.json()[0]

    gen_payload = {
        "class_id": grade_10["id"],
        "academic_year_id": curr_year["id"],
        "fee_structure_id": struct["id"],
        "title": "Grade 10 Term 2 Fee",
        "due_date": "2026-11-30",
    }
    gen_resp = client.post(
        f"{settings.API_V1_STR}/fees/invoices/generate-class",
        headers=accountant_headers,
        json=gen_payload,
    )
    assert gen_resp.status_code == 201
    invoices = gen_resp.json()
    assert len(invoices) >= 1
    assert any(i["title"] == "Grade 10 Term 2 Fee" for i in invoices)


def test_financial_summary_report(client, accountant_headers):
    resp = client.get(f"{settings.API_V1_STR}/fees/reports/summary", headers=accountant_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "today_collection" in data
    assert "total_collected" in data
    assert "total_outstanding" in data
    assert "paid_invoices_count" in data
    assert "unpaid_invoices_count" in data
    assert float(data["total_invoiced"]) > 0


def test_fee_rbac_protections(client, teacher_headers, student_headers):
    # Teacher cannot collect payment
    dummy_invoice_id = str(uuid.uuid4())
    teacher_collect = client.post(
        f"{settings.API_V1_STR}/fees/payments/collect",
        headers=teacher_headers,
        json={
            "invoice_id": dummy_invoice_id,
            "amount": 1000.00,
            "payment_method": "CASH",
        },
    )
    assert teacher_collect.status_code == 403

    # Student cannot create fee types
    student_create_type = client.post(
        f"{settings.API_V1_STR}/fees/types",
        headers=student_headers,
        json={"name": "Hacker Fee", "code": "HACK"},
    )
    assert student_create_type.status_code == 403

    # Student can list their own invoices
    student_invs = client.get(f"{settings.API_V1_STR}/fees/invoices", headers=student_headers)
    assert student_invs.status_code == 200
    data = student_invs.json()
    assert "items" in data
    for item in data["items"]:
        assert item["admission_number"] == "ADM-2026-0001"
