import Product from '../models/product.model.js';
import Base from '../models/base.model.js';
import Strap from '../models/strap.model.js';
import Thumb from '../models/thumb.model.js';

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const getAvailable = (variant) => {
  const stockQuantity = Number(variant?.stockQuantity || 0);
  const reservedQuantity = Number(variant?.reservedQuantity || 0);

  return stockQuantity - reservedQuantity;
};

const getQuantity = (value) => {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Invalid reservation quantity.');
  }

  return quantity;
};

const validateSession = (session) => {
  if (!session) {
    throw new Error('MongoDB session is required for inventory reservation.');
  }
};

const getComponentModel = (kind) => {
  switch (kind) {
    case 'base':
      return Base;

    case 'strap':
      return Strap;

    case 'thumb':
      return Thumb;

    default:
      return null;
  }
};

/*
 * ============================================================
 * RESERVE STOCK
 * ============================================================
 *
 * AVAILABLE STOCK:
 *
 * stockQuantity - reservedQuantity
 *
 * Example:
 *
 * stockQuantity     = 10
 * reservedQuantity  = 3
 *
 * available         = 7
 *
 * Reserving 2:
 *
 * reservedQuantity  = 5
 * stockQuantity     = 10
 *
 * Actual stock is NOT reduced yet.
 *
 * Stock is reduced only when the payment/order is committed.
 *
 * ============================================================
 */

export const reserveStock = async ({ requirements, session }) => {
  validateSession(session);

  if (!Array.isArray(requirements) || requirements.length === 0) {
    throw new Error('No inventory requirements supplied.');
  }

  const modifiedDocuments = [];

  for (const requirement of requirements) {
    const quantity = getQuantity(requirement?.required);

    /*
     * ========================================================
     * STANDARD PRODUCT
     * ========================================================
     */

    if (requirement.kind === 'standard') {
      if (!requirement.productId || !requirement.variantId) {
        throw new Error(
          'Standard inventory reservation information is incomplete.',
        );
      }

      const product = await Product.findById(requirement.productId).session(
        session,
      );

      if (!product) {
        throw new Error('Product not found.');
      }

      const variant = product.standardStock?.id(requirement.variantId);

      if (!variant) {
        throw new Error(
          `Product size ${requirement.size} is no longer available.`,
        );
      }

      /*
       * Make sure the reservation references the expected size.
       */

      if (
        requirement.size != null &&
        String(variant.size) !== String(requirement.size)
      ) {
        throw new Error(
          `Product size ${requirement.size} is no longer available.`,
        );
      }

      const stockQuantity = Number(variant.stockQuantity || 0);

      const reservedQuantity = Number(variant.reservedQuantity || 0);

      if (
        !Number.isFinite(stockQuantity) ||
        stockQuantity < 0 ||
        !Number.isFinite(reservedQuantity) ||
        reservedQuantity < 0
      ) {
        throw new Error(
          `Invalid inventory state for product size ${requirement.size}.`,
        );
      }

      const available = getAvailable(variant);

      if (available < quantity) {
        throw new Error(
          `Only ${available} item(s) are available for size ${requirement.size}.`,
        );
      }

      variant.reservedQuantity = reservedQuantity + quantity;

      await product.save({
        session,
      });

      modifiedDocuments.push({
        kind: 'standard',
        productId: product._id,
        variantId: variant._id,
        size: String(variant.size),
        quantity,
      });

      continue;
    }

    /*
     * ========================================================
     * CUSTOMIZABLE COMPONENT
     * ========================================================
     */

    const Model = getComponentModel(requirement.kind);

    if (!Model) {
      throw new Error(
        `Invalid inventory requirement type: ${requirement.kind}.`,
      );
    }

    if (
      !requirement.componentId ||
      !requirement.colorId ||
      !requirement.variantId
    ) {
      throw new Error(
        `${requirement.kind} inventory reservation information is incomplete.`,
      );
    }

    const component = await Model.findById(requirement.componentId).session(
      session,
    );

    if (!component) {
      throw new Error(`${requirement.kind} component not found.`);
    }

    const color = component.colors?.id(requirement.colorId);

    if (!color) {
      throw new Error(`${requirement.kind} color is no longer available.`);
    }

    const variant = color.variants?.id(requirement.variantId);

    if (!variant) {
      throw new Error(
        `${requirement.kind} size ${requirement.size} is no longer available.`,
      );
    }

    /*
     * Make sure the reservation references the expected size.
     */

    if (
      requirement.size != null &&
      String(variant.size) !== String(requirement.size)
    ) {
      throw new Error(
        `${requirement.kind} size ${requirement.size} is no longer available.`,
      );
    }

    const stockQuantity = Number(variant.stockQuantity || 0);

    const reservedQuantity = Number(variant.reservedQuantity || 0);

    if (
      !Number.isFinite(stockQuantity) ||
      stockQuantity < 0 ||
      !Number.isFinite(reservedQuantity) ||
      reservedQuantity < 0
    ) {
      throw new Error(`Invalid ${requirement.kind} inventory state.`);
    }

    const available = getAvailable(variant);

    if (available < quantity) {
      throw new Error(
        `Only ${available} ${requirement.kind} item(s) are available.`,
      );
    }

    variant.reservedQuantity = reservedQuantity + quantity;

    await component.save({
      session,
    });

    modifiedDocuments.push({
      kind: requirement.kind,
      componentId: component._id,
      colorId: color._id,
      variantId: variant._id,
      size: String(variant.size),
      quantity,
    });
  }

  return modifiedDocuments;
};

/*
 * ============================================================
 * RELEASE STOCK RESERVATION
 * ============================================================
 *
 * Used when:
 *
 * - payment.failed
 * - payment timeout
 * - payment/order abandoned
 * - reservation expiry
 *
 * IMPORTANT:
 *
 * This function ONLY releases reservedQuantity.
 *
 * It does NOT change stockQuantity.
 *
 * ============================================================
 */

export const releaseStockReservation = async ({ reservations, session }) => {
  validateSession(session);

  if (!Array.isArray(reservations)) {
    throw new Error('Invalid stock reservations.');
  }

  if (reservations.length === 0) {
    return [];
  }

  const releasedReservations = [];

  for (const reservation of reservations) {
    const quantity = getQuantity(reservation?.quantity);

    /*
     * ========================================================
     * STANDARD
     * ========================================================
     */

    if (reservation.kind === 'standard') {
      if (!reservation.productId || !reservation.variantId) {
        throw new Error('Standard reservation information is incomplete.');
      }

      const product = await Product.findById(reservation.productId).session(
        session,
      );

      if (!product) {
        throw new Error('Product not found while releasing reservation.');
      }

      const variant = product.standardStock?.id(reservation.variantId);

      if (!variant) {
        throw new Error(
          'Standard inventory variant not found while releasing reservation.',
        );
      }

      const reservedQuantity = Number(variant.reservedQuantity || 0);

      if (!Number.isFinite(reservedQuantity) || reservedQuantity < 0) {
        throw new Error('Invalid reserved quantity for standard inventory.');
      }

      /*
       * Never allow release to consume more reservation than
       * currently exists.
       */

      if (reservedQuantity < quantity) {
        throw new Error(
          `Reserved standard inventory is insufficient for release.`,
        );
      }

      variant.reservedQuantity = reservedQuantity - quantity;

      await product.save({
        session,
      });

      releasedReservations.push({
        kind: 'standard',
        productId: product._id,
        variantId: variant._id,
        size: String(reservation.size || variant.size || ''),
        quantity,
      });

      continue;
    }

    /*
     * ========================================================
     * CUSTOMIZABLE COMPONENT
     * ========================================================
     */

    const Model = getComponentModel(reservation.kind);

    if (!Model) {
      throw new Error(`Invalid reservation type: ${reservation.kind}.`);
    }

    if (
      !reservation.componentId ||
      !reservation.colorId ||
      !reservation.variantId
    ) {
      throw new Error(
        `${reservation.kind} reservation information is incomplete.`,
      );
    }

    const component = await Model.findById(reservation.componentId).session(
      session,
    );

    if (!component) {
      throw new Error(
        `${reservation.kind} component not found while releasing reservation.`,
      );
    }

    const color = component.colors?.id(reservation.colorId);

    if (!color) {
      throw new Error(
        `${reservation.kind} color not found while releasing reservation.`,
      );
    }

    const variant = color.variants?.id(reservation.variantId);

    if (!variant) {
      throw new Error(
        `${reservation.kind} variant not found while releasing reservation.`,
      );
    }

    const reservedQuantity = Number(variant.reservedQuantity || 0);

    if (!Number.isFinite(reservedQuantity) || reservedQuantity < 0) {
      throw new Error(
        `Invalid reserved quantity for ${reservation.kind} inventory.`,
      );
    }

    if (reservedQuantity < quantity) {
      throw new Error(
        `Reserved ${reservation.kind} inventory is insufficient for release.`,
      );
    }

    variant.reservedQuantity = reservedQuantity - quantity;

    await component.save({
      session,
    });

    releasedReservations.push({
      kind: reservation.kind,
      componentId: component._id,
      colorId: color._id,
      variantId: variant._id,
      size: String(reservation.size || variant.size || ''),
      quantity,
    });
  }

  return releasedReservations;
};

/*
 * ============================================================
 * COMMIT STOCK RESERVATION
 * ============================================================
 *
 * Called after successful payment.
 *
 * RESERVED INVENTORY:
 *
 * stockQuantity     -= quantity
 * reservedQuantity -= quantity
 *
 * Example:
 *
 * stockQuantity     = 10
 * reservedQuantity  = 3
 *
 * commit 2:
 *
 * stockQuantity     = 8
 * reservedQuantity  = 1
 *
 * ============================================================
 */

export const commitStockReservation = async ({ reservations, session }) => {
  validateSession(session);

  if (!Array.isArray(reservations) || reservations.length === 0) {
    throw new Error('No stock reservations to commit.');
  }

  const inventoryEntries = [];

  for (const reservation of reservations) {
    const quantity = getQuantity(reservation?.quantity);

    /*
     * ========================================================
     * STANDARD
     * ========================================================
     */

    if (reservation.kind === 'standard') {
      if (!reservation.productId || !reservation.variantId) {
        throw new Error('Standard reservation information is incomplete.');
      }

      const product = await Product.findById(reservation.productId).session(
        session,
      );

      if (!product) {
        throw new Error('Product not found while committing stock.');
      }

      const variant = product.standardStock?.id(reservation.variantId);

      if (!variant) {
        throw new Error('Standard inventory variant not found.');
      }

      /*
       * Verify size when available.
       */

      if (
        reservation.size != null &&
        String(variant.size) !== String(reservation.size)
      ) {
        throw new Error('Standard inventory reservation size mismatch.');
      }

      const currentStock = Number(variant.stockQuantity || 0);

      const currentReserved = Number(variant.reservedQuantity || 0);

      if (
        !Number.isFinite(currentStock) ||
        currentStock < 0 ||
        !Number.isFinite(currentReserved) ||
        currentReserved < 0
      ) {
        throw new Error('Invalid standard inventory state.');
      }

      /*
       * A committed reservation must have enough reserved
       * quantity and physical stock.
       */

      if (currentReserved < quantity || currentStock < quantity) {
        throw new Error('Reserved standard inventory is no longer valid.');
      }

      const previousStock = currentStock;

      const newStock = currentStock - quantity;

      const newReserved = currentReserved - quantity;

      variant.stockQuantity = newStock;
      variant.reservedQuantity = newReserved;

      await product.save({
        session,
      });

      inventoryEntries.push({
        type: 'ORDER',
        itemType: 'STANDARD',
        productId: product._id,
        variantId: variant._id,
        size: reservation.size || variant.size || null,
        quantity,
        previousStock,
        newStock,
      });

      continue;
    }

    /*
     * ========================================================
     * CUSTOMIZABLE COMPONENT
     * ========================================================
     */

    const Model = getComponentModel(reservation.kind);

    if (!Model) {
      throw new Error(`Invalid reservation type: ${reservation.kind}.`);
    }

    if (
      !reservation.componentId ||
      !reservation.colorId ||
      !reservation.variantId
    ) {
      throw new Error(
        `${reservation.kind} reservation information is incomplete.`,
      );
    }

    const component = await Model.findById(reservation.componentId).session(
      session,
    );

    if (!component) {
      throw new Error(`${reservation.kind} component not found.`);
    }

    const color = component.colors?.id(reservation.colorId);

    if (!color) {
      throw new Error(`${reservation.kind} color not found.`);
    }

    const variant = color.variants?.id(reservation.variantId);

    if (!variant) {
      throw new Error(`${reservation.kind} variant not found.`);
    }

    /*
     * Verify size when available.
     */

    if (
      reservation.size != null &&
      String(variant.size) !== String(reservation.size)
    ) {
      throw new Error(
        `${reservation.kind} inventory reservation size mismatch.`,
      );
    }

    const currentStock = Number(variant.stockQuantity || 0);

    const currentReserved = Number(variant.reservedQuantity || 0);

    if (
      !Number.isFinite(currentStock) ||
      currentStock < 0 ||
      !Number.isFinite(currentReserved) ||
      currentReserved < 0
    ) {
      throw new Error(`Invalid ${reservation.kind} inventory state.`);
    }

    if (currentReserved < quantity || currentStock < quantity) {
      throw new Error(
        `Reserved ${reservation.kind} inventory is no longer valid.`,
      );
    }

    const previousStock = currentStock;

    const newStock = currentStock - quantity;

    const newReserved = currentReserved - quantity;

    variant.stockQuantity = newStock;
    variant.reservedQuantity = newReserved;

    await component.save({
      session,
    });

    inventoryEntries.push({
      type: 'ORDER',
      itemType: reservation.kind.toUpperCase(),
      componentId: component._id,
      colorId: color._id,
      variantId: variant._id,
      size: reservation.size || variant.size || null,
      quantity,
      previousStock,
      newStock,
    });
  }

  return inventoryEntries;
};
