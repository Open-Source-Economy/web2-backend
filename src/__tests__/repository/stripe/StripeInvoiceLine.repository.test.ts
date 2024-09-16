// import { type Express } from "express";
// import {getStripeCustomerRepository, getStripeInvoiceLineRepository, getStripeInvoiceRepository} from "../../../db";
// import {setupTestDB} from "../../jest.setup";
// import {createApp} from "../../../createApp";
//
//
//
// describe("StripeInvoiceLineRepository", () => {
//     let app: Express = createApp();
//
//     setupTestDB();
//
//     const invoiceLineRepo = getStripeInvoiceLineRepository();
//     const invoiceRepo = getStripeInvoiceRepository();
//     const customerRepo = getStripeCustomerRepository();
//
//     describe("create", () => {
//         it("should work", async () => {
//             const customerId = new CustomerId(Fixture.id());
//             const invoiceId = new StripeInvoiceId(Fixture.id());
//
//             // Insert customer and invoice before inserting the invoice line
//             await customerRepo.insert(Fixture.customer(customerId));
//             await invoiceRepo.insert(Fixture.stripeInvoice(invoiceId, customerId));
//
//             const invoiceLine = Fixture.stripeInvoiceLine(
//                 Fixture.id(),
//                 invoiceId,
//                 customerId,
//                 Fixture.id(),
//                 Fixture.id(),
//                 Fixture.randomNumber()
//             );
//             const created = await invoiceLineRepo.insert(invoiceLine);
//
//             expect(created).toEqual(invoiceLine);
//
//             const found = await invoiceLineRepo.getById(invoiceLine.stripeId);
//             expect(found).toEqual(invoiceLine);
//         });
//
//         it("should fail with foreign key constraint error if invoice or customer is not inserted", async () => {
//             const invoiceLineId = Fixture.id();
//             const invoiceId = new StripeInvoiceId(Fixture.id()); // InvoiceId that does not exist in the database
//             const customerId = new CustomerId(Fixture.id()); // CustomerId that does not exist in the database
//
//             const invoiceLine = Fixture.stripeInvoiceLine(
//                 invoiceLineId,
//                 invoiceId,
//                 customerId,
//                 Fixture.id(),
//                 Fixture.id(),
//                 Fixture.randomNumber()
//             );
//
//             try {
//                 await invoiceLineRepo.insert(invoiceLine);
//                 // If the insertion doesn't throw, fail the test
//                 fail(
//                     "Expected foreign key constraint violation, but no error was thrown.",
//                 );
//             } catch (error: any) {
//                 // Check if the error is related to foreign key constraint
//                 expect(error.message).toMatch(/violates foreign key constraint/);
//             }
//         });
//     });
//
//     describe("getById", () => {
//         it("should return null if invoice line not found", async () => {
//             const nonExistentInvoiceLineId = "non-existent-id";
//             const found = await invoiceLineRepo.getById(nonExistentInvoiceLineId);
//
//             expect(found).toBeNull();
//         });
//     });
//
//     describe("getAll", () => {
//         it("should return all invoice lines", async () => {
//             const customerId = new CustomerId(Fixture.id());
//             const invoiceId = new StripeInvoiceId(Fixture.id());
//
//             await customerRepo.insert(Fixture.customer(customerId));
//             await invoiceRepo.insert(Fixture.stripeInvoice(invoiceId, customerId));
//
//             const invoiceLine1 = Fixture.stripeInvoiceLine(
//                 Fixture.id(),
//                 invoiceId,
//                 customerId,
//                 Fixture.id(),
//                 Fixture.id(),
//                 Fixture.randomNumber()
//             );
//             const invoiceLine2 = Fixture.stripeInvoiceLine(
//                 Fixture.id(),
//                 invoiceId,
//                 customerId,
//                 Fixture.id(),
//                 Fixture.id(),
//                 Fixture.randomNumber()
//             );
//
//             await invoiceLineRepo.insert(invoiceLine1);
//             await invoiceLineRepo.insert(invoiceLine2);
//
//             const allInvoiceLines = await invoiceLineRepo.getAll();
//
//             expect(allInvoiceLines).toHaveLength(2);
//             expect(allInvoiceLines).toContainEqual(invoiceLine1);
//             expect(allInvoiceLines).toContainEqual(invoiceLine2);
//         });
//
//         it("should return an empty array if no invoice lines exist", async () => {
//             const allInvoiceLines = await invoiceLineRepo.getAll();
//             expect(allInvoiceLines).toEqual([]);
//         });
//     });
// });
