/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  ("use strict");

  const select = {
    templateOf: {
      menuProduct: "#template-menu-product",
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
        input: 'input[name="amount"]',
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
  };

  const classNames = {
    menuProduct: {
      wrapperActive: "active",
      imageVisible: "active",
    },
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
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
      this.accordionTrigger.addEventListener("click", event => {
        event.preventDefault();

        const activeMenuProduct = document.querySelector(select.all.menuProductsActive);
        if (activeMenuProduct && activeMenuProduct.getAttribute("data-type") !== this.id)
          activeMenuProduct.classList.remove("active");

        this.element.classList.toggle("active");
      });
    }

    initOrderForm() {
      this.form.addEventListener("submit", event => {
        event.preventDefault();
        this.processOrder();
      });

      for (let input of this.formInputs) {
        input.addEventListener("change", () => {
          this.processOrder();
        });
      }

      this.cartButton.addEventListener("click", event => {
        event.preventDefault();
        this.processOrder();
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

      price *= this.amountWidget.value; // multiply price by amount

      this.priceElem.innerHTML = price;
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
  }

  class AmountWidget {
    constructor(element) {
      this.getElements(element);
      this.initActions();
      this.setValue(this.input.value);

      // set initial value
      this.value = settings.amountWidget.defaultValue;
      this.input.value = settings.amountWidget.defaultValue;
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
      this.input.addEventListener("change", event => {
        this.setValue(event.currentTarget.value);
      });

      this.linkDecrease.addEventListener("click", event => {
        event.preventDefault();
        this.setValue(this.value - 1);
      });

      this.linkIncrease.addEventListener("click", event => {
        event.preventDefault();
        this.setValue(this.value + 1);
      });
    }

    announce() {
      const event = new Event("update");
      this.element.dispatchEvent(event);
    }
  }

  const app = {
    initMenu() {
      for (let productData in this.data.products) {
        new Product(productData, this.data.products[productData]);
      }
    },

    initData() {
      const thisApp = this;
      thisApp.data = dataSource;
    },

    init: function () {
      const thisApp = this;
      // console.log("*** App starting ***");
      // console.log("thisApp:", thisApp);
      // console.log("classNames:", classNames);
      // console.log("settings:", settings);
      // console.log("templates:", templates);

      thisApp.initData();
      thisApp.initMenu();
    },
  };

  app.init();
}
