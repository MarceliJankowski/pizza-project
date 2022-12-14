/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  ("use strict");

  const select = {
    templateOf: {
      menuProduct: "#template-menu-product",
      cartProduct: "#template-cart-product",
    },
    containerOf: {
      menu: "#product-list",
      cart: "#cart",
    },
    all: {
      menuProducts: "#product-list > .product",
      menuProductsActive: "#product-list > .product.active",
      formInputs: "input, select",
    },
    menuProduct: {
      clickable: ".product__header",
      form: ".product__order",
      priceElem: ".product__total-price .price",
      imageWrapper: ".product__images",
      amountWidget: ".widget-amount",
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: "input.amount",
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
    cart: {
      productList: ".cart__order-summary",
      toggleTrigger: ".cart__summary",
      totalNumber: `.cart__total-number`,
      totalPrice: ".cart__total-price strong, .cart__order-total .cart__order-price-sum strong",
      subtotalPrice: ".cart__order-subtotal .cart__order-price-sum strong",
      deliveryFee: ".cart__order-delivery .cart__order-price-sum strong",
      form: ".cart__order",
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: ".widget-amount",
      price: ".cart__product-price",
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
  };

  const classNames = {
    menuProduct: {
      wrapperActive: "active",
      imageVisible: "active",
    },

    cart: {
      wrapperActive: "active",
    },
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    },
    cart: {
      defaultDeliveryFee: 20,
    },
    db: {
      url: "//localhost:3131",
      products: "products",
      orders: "orders",
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
    cartProduct: Handlebars.compile(document.querySelector(select.templateOf.cartProduct).innerHTML),
  };

  class Product {
    constructor(id, data) {
      this.id = id;
      this.data = { ...data, id };

      this.renderInMenu();
      this.getElements();
      this.initAccordion();
      this.initOrderForm();
      this.initAmountWidget();
      this.processOrder();
    }

    renderInMenu() {
      const generatedHTML = templates.menuProduct(this.data);

      this.element = utils.createDOMFromHTML(generatedHTML);

      const menuContainer = document.querySelector(select.containerOf.menu);

      menuContainer.appendChild(this.element);
    }

    initAccordion() {
      this.accordionTrigger.addEventListener("click", (event) => {
        event.preventDefault();

        const activeMenuProduct = document.querySelector(select.all.menuProductsActive);
        if (activeMenuProduct && activeMenuProduct.getAttribute("data-type") !== this.id)
          activeMenuProduct.classList.remove("active");

        this.element.classList.toggle("active");
      });
    }

    initOrderForm() {
      this.form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.processOrder();
      });

      for (let input of this.formInputs) {
        input.addEventListener("change", () => {
          this.processOrder();
        });
      }

      this.cartButton.addEventListener("click", (event) => {
        event.preventDefault();
        this.processOrder();
        this.addToCart();
      });
    }

    processOrder() {
      const formData = utils.serializeFormToObject(this.form);

      let price = this.data.price; // set price to default price

      // O(n^2) Painful...
      for (let paramId in this.data.params) {
        const param = this.data.params[paramId];

        for (let optionId in param.options) {
          const option = param.options[optionId];

          const isOptionSet = formData[paramId].includes(optionId);

          // handle images
          const image = this.imageWrapper.querySelector(`img.${paramId}-${optionId}`);
          if (image) isOptionSet ? image.classList.add("active") : image.classList.remove("active");

          // handle prices
          if (!isOptionSet && option.default) price -= option.price;
          else if (isOptionSet && !option.default) price += option.price;
        }
      }

      const priceSingle = price;
      price *= this.amountWidget.value; // multiply price by amount

      this.data.amount = this.amountWidget.value;
      this.priceElem.innerHTML = price;
      this.data.priceSingle = priceSingle;
    }

    getElements() {
      this.amountWidgetElement = this.element.querySelector(select.menuProduct.amountWidget);
      this.imageWrapper = this.element.querySelector(select.menuProduct.imageWrapper);
      this.accordionTrigger = this.element.querySelector(select.menuProduct.clickable);
      this.form = this.element.querySelector(select.menuProduct.form);
      this.formInputs = this.form.querySelectorAll(select.all.formInputs);
      this.cartButton = this.element.querySelector(select.menuProduct.cartButton);
      this.priceElem = this.element.querySelector(select.menuProduct.priceElem);
    }

    initAmountWidget() {
      this.amountWidget = new AmountWidget(this.amountWidgetElement);

      this.amountWidgetElement.addEventListener("update", () => this.processOrder());
    }

    addToCart() {
      const product = this.prepareCartProduct();
      app.cart.add(product);
    }

    prepareCartProduct() {
      const { id, name, amount, priceSingle } = this.data;

      const productSummary = {
        id,
        name,
        amount,
        priceSingle,
        get price() {
          return Number(priceSingle) * this.amount;
        },
        params: this.prepareCartProductParams(),
      };

      return productSummary;
    }

    prepareCartProductParams() {
      const formData = utils.serializeFormToObject(this.form);

      const params = {};

      for (let paramId in this.data.params) {
        const { options, label } = this.data.params[paramId];

        for (let optionId in options) {
          const isOptionSet = formData[paramId].includes(optionId);
          if (!isOptionSet) continue;

          const option = options[optionId];

          params[paramId] ??= { label, options: {} };
          params[paramId].options[optionId] = option.label;
        }
      }

      return params;
    }
  }

  class AmountWidget {
    constructor(element, value = settings.amountWidget.defaultValue) {
      this.getElements(element);
      this.initActions();
      this.setValue(this.input.value);

      // set initial value
      this.value = value;
      this.input.value = value;
    }

    getElements(element) {
      this.element = element;
      this.input = this.element.querySelector(select.widgets.amount.input);
      this.linkDecrease = this.element.querySelector(select.widgets.amount.linkDecrease);
      this.linkIncrease = this.element.querySelector(select.widgets.amount.linkIncrease);
    }

    setValue(value) {
      const newValue = parseInt(value);

      const isNewValueChanged = newValue !== this.value;
      const isNewValueNumber = typeof newValue === "number";
      const isNewValueWithinLimits =
        newValue >= settings.amountWidget.defaultMin && newValue <= settings.amountWidget.defaultMax;

      if (isNewValueChanged && isNewValueNumber && isNewValueWithinLimits) this.value = newValue;

      this.input.value = this.value;

      this.announce();
    }

    initActions() {
      this.input.addEventListener("change", (event) => {
        this.setValue(event.currentTarget.value);
      });

      this.linkDecrease.addEventListener("click", (event) => {
        event.preventDefault();
        this.setValue(this.value - 1);
      });

      this.linkIncrease.addEventListener("click", (event) => {
        event.preventDefault();
        this.setValue(this.value + 1);
      });
    }

    announce() {
      const event = new CustomEvent("update", { bubbles: true });
      this.element.dispatchEvent(event);
    }
  }

  class Cart {
    constructor(element) {
      this.products = new Array();
      this.deliveryFee = settings.cart.defaultDeliveryFee;

      this.getElements(element);
      this.initActions();
    }

    getElements(element) {
      this.dom = {
        wrapper: element,
        toggleTrigger: element.querySelector(select.cart.toggleTrigger),
        productList: element.querySelector(select.cart.productList),
        deliveryFee: element.querySelector(select.cart.deliveryFee),
        subtotalPrice: element.querySelector(select.cart.subtotalPrice),
        totalPrice: element.querySelectorAll(select.cart.totalPrice),
        totalNumber: element.querySelector(select.cart.totalNumber),
        form: element.querySelector(select.cart.form),
        phone: element.querySelector(select.cart.phone),
        address: element.querySelector(select.cart.address),
      };
    }

    initActions() {
      this.dom.toggleTrigger.addEventListener("click", () => {
        this.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });

      this.dom.productList.addEventListener("update", () => this.update());

      this.dom.productList.addEventListener("remove", (event) => this.remove(event.detail.cartProduct));

      this.dom.form.addEventListener("submit", (event) => {
        event.preventDefault();

        this.sendOrder();
      });
    }

    add(menuProduct) {
      const generatedHTML = templates.cartProduct(menuProduct);
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);

      this.dom.productList.appendChild(generatedDOM);

      this.products.push(new CartProduct(menuProduct, generatedDOM));

      this.update();
    }

    update() {
      let totalPriceWithoutDeliveryFee = 0;
      let productsInCartQuantity = 0;

      this.products.forEach(({ menuProduct: { amount, price } }) => {
        productsInCartQuantity += amount;
        totalPriceWithoutDeliveryFee += price;
      });

      this.totalPrice = totalPriceWithoutDeliveryFee && totalPriceWithoutDeliveryFee + this.deliveryFee;
      this.totalNumber = productsInCartQuantity;
      this.subtotalPrice = totalPriceWithoutDeliveryFee;

      this.dom.deliveryFee.innerText = this.totalPrice && this.deliveryFee;
      this.dom.subtotalPrice.innerText = totalPriceWithoutDeliveryFee;
      this.dom.totalNumber.innerText = productsInCartQuantity;
      this.dom.totalPrice.forEach((el) => (el.innerText = this.totalPrice));
    }

    remove(product) {
      product.dom.wrapper.remove(); // remove product from DOM

      // remove product from product container
      const productIndex = this.products.findIndex((el) => el === product);
      this.products.splice(productIndex, 1);

      this.update();
    }

    sendOrder() {
      const { url: dbUrl, orders: dbOrders } = settings.db;

      const url = `${dbUrl}/${dbOrders}`;

      const productsSuccint = this.products.map(({ id, name, price, amount, priceSingle, params }) => ({
        id,
        name,
        price,
        amount,
        priceSingle,
        params,
      }));

      const payload = {
        address: this.dom.address.value,
        phone: this.dom.phone.value,
        totalPrice: this.totalPrice,
        subtotalPrice: this.subtotalPrice,
        totalNumber: this.totalNumber,
        deliveryFee: this.deliveryFee,
        products: productsSuccint,
      };

      const payloadJSON = JSON.stringify(payload);

      // why handle promise rejection when we can assume that everything went OK?
      fetch(url, {
        method: "POST",
        body: payloadJSON,
        headers: {
          "content-type": "application/json",
        },
      });
    }
  }

  class CartProduct {
    constructor(menuProduct, element) {
      this.menuProduct = menuProduct;
      this.element = element;

      this.getElements(element);
      this.initAmountWidget();
      this.initActions();
    }

    getElements(element) {
      this.dom = {
        wrapper: element,
        amountWidget: element.querySelector(select.cartProduct.amountWidget),
        price: element.querySelector(select.cartProduct.price),
        edit: element.querySelector(select.cartProduct.edit),
        remove: element.querySelector(select.cartProduct.remove),
      };
    }

    initAmountWidget() {
      this.amountWidget = new AmountWidget(this.dom.amountWidget, this.menuProduct.amount);

      this.dom.amountWidget.addEventListener("update", () => {
        this.menuProduct.amount = this.amountWidget.value;

        this.dom.price.innerText = this.menuProduct.price;
      });
    }

    remove() {
      const event = new CustomEvent("remove", {
        bubbles: true,
        detail: {
          cartProduct: this,
        },
      });

      this.dom.wrapper.dispatchEvent(event);
    }

    initActions() {
      this.dom.edit.addEventListener("click", (event) => {
        event.preventDefault();
      });

      this.dom.remove.addEventListener("click", (event) => {
        event.preventDefault();
        this.remove();
      });
    }
  }

  const app = {
    initMenu() {
      for (let productData in this.data.products) {
        new Product(this.data.products[productData].id, this.data.products[productData]);
      }
    },

    initData() {
      this.data = {};
      const { url: dbUrl, products: dbProducts } = settings.db;

      const url = `${dbUrl}/${dbProducts}`;

      fetch(url, { method: "GET" })
        .then((res) => res.json())
        .then((parsedRes) => {
          this.data.products = parsedRes;

          this.initMenu();
        });
    },

    initCart() {
      const cartElement = document.querySelector(select.containerOf.cart);
      this.cart = new Cart(cartElement);
    },

    init: function () {
      this.initData();
      this.initCart();
    },
  };

  app.init();
}
