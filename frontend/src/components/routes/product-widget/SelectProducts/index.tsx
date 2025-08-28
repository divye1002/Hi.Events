import { t, Trans } from "@lingui/macro";
import {
    ActionIcon,
    Anchor,
    Button,
    Collapse,
    Group,
    Input,
    Modal,
    Spoiler,
    TextInput,
    UnstyledButton
} from "@mantine/core";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
    orderClientPublic,
    ProductFormPayload,
    ProductFormValue,
    ProductPriceQuantityFormValue
} from "../../../../api/order.client.ts";
import { useForm } from "@mantine/form";
import { range, useInputState, useResizeObserver } from "@mantine/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { showError, showInfo, showSuccess } from "../../../../utilites/notifications.tsx";
import { addQueryStringToUrl, isObjectEmpty, removeQueryStringFromUrl } from "../../../../utilites/helpers.ts";
import { TieredPricing } from "./Prices/Tiered";
import classNames from 'classnames';
import '../../../../styles/widget/default.scss';
import { ProductAvailabilityMessage } from "../../../common/ProductPriceAvailability";
import { PoweredByFooter } from "../../../common/PoweredByFooter";
import { Event, Product } from "../../../../types.ts";
import { eventsClientPublic } from "../../../../api/event.client.ts";
import { promoCodeClientPublic } from "../../../../api/promo-code.client.ts";
import { IconChevronRight, IconX } from "@tabler/icons-react"
import { getSessionIdentifier } from "../../../../utilites/sessionIdentifier.ts";
import { Constants } from "../../../../constants.ts";

const AFFILIATE_EXPIRY_DAYS = 30;

const sendHeightToIframeWidgets = () => {
    const height = document.documentElement.scrollHeight;
    const widgetHeight = document.querySelector('.hi-product-widget-container')?.getBoundingClientRect().height || 0;
    const urlParams = new URLSearchParams(window.location.search);
    const iframeId = urlParams.get('iframeId');

    const finalHeight = Math.max(height, widgetHeight);

    if (!iframeId) {
        return;
    }

    window.parent.postMessage({
        type: 'resize',
        height: finalHeight,
        iframeId: iframeId
    }, '*');
};

interface SelectProductsProps {
    event: Event;
    promoCodeValid?: boolean;
    promoCode?: string;
    backgroundType?: 'COLOR' | 'MIRROR_COVER_IMAGE';
    colors?: {
        primary?: string;
        primaryText?: string;
        secondary?: string;
        secondaryText?: string;
        background?: string;
        bodyBackground?: string;
    },
    padding?: string;
    continueButtonText?: string;
    widgetMode?: 'preview' | 'normal' | 'embedded';
    showPoweredBy?: boolean;
}

const SelectProducts = (props: SelectProductsProps) => {
    const { eventId } = useParams();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const promoRef = useRef<HTMLInputElement>(null);
    const [showPromoCodeInput, setShowPromoCodeInput] = useInputState<boolean>(false);
    const [event, setEvent] = useState(props.event);
    const [orderInProcessOverlayVisible, setOrderInProcessOverlayVisible] = useState(false);
    const [resizeRef, resizeObserverRect] = useResizeObserver();
    const [collapsedProducts, setCollapsedProducts] = useState<{ [key: number]: boolean }>({});
    const [affiliateCode, setAffiliateCode] = useState<string | null>(null);

    useEffect(() => sendHeightToIframeWidgets(), [resizeObserverRect.height]);

    useEffect(() => {
        const storageKey = 'affiliate_code_' + eventId;

        const now = Date.now();
        const affiliateCodeFromUrl = new URLSearchParams(window.location.search).get('aff');

        if (affiliateCodeFromUrl) {
            const data = { code: affiliateCodeFromUrl, timestamp: now };
            localStorage.setItem(storageKey, JSON.stringify(data));
            setAffiliateCode(affiliateCodeFromUrl);
            return;
        }

        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                const ageInDays = (now - parsed.timestamp) / (1000 * 60 * 60 * 24);
                if (ageInDays <= AFFILIATE_EXPIRY_DAYS) {
                    setAffiliateCode(parsed.code);
                } else {
                    localStorage.removeItem(storageKey);
                }
            } catch {
                localStorage.removeItem(storageKey);
            }
        }
    }, []);

    useEffect(() => {
        form.setFieldValue('affiliate_code', affiliateCode || null);
    }, [affiliateCode]);

    const form = useForm<ProductFormPayload>({
        initialValues: {
            products: undefined,
            promo_code: props.promoCodeValid ? props.promoCode || null : null,
            affiliate_code: affiliateCode || null,
            session_identifier: undefined,
        },
    });

    const productMutation = useMutation({
        mutationFn: (orderData: ProductFormPayload) => orderClientPublic.create(Number(eventId), orderData),

        onSuccess: (data) => queryClient.invalidateQueries()
            .then(() => {
                const url = '/checkout/' + eventId + '/' + data.data.short_id + '/details';
                if (props.widgetMode === 'embedded') {
                    window.open(
                        url + '?session_identifier=' + data.data.session_identifier + '&utm_source=embedded_widget',
                        '_blank'
                    );
                    setOrderInProcessOverlayVisible(true);
                    return;
                }

                return navigate(url);
            }),

        onError: (error: any) => {
            if (error?.response?.data?.errors) {
                form.setErrors(error.response.data.errors);
            }

            notifications.show({
                message: error.response.data.errors?.products[0] || t`Unable to create product. Please check your details`,
                color: 'red',
            });
        }
    });

    const promoCodeEventRefetchMutation = useMutation({
        mutationFn: async (promoCode: string | null) => {
            if (promoCode) {
                const validPromoCode = await promoCodeClientPublic.validateCode(
                    eventId,
                    promoCode
                );

                if (!validPromoCode.valid) {
                    showError(t`That promo code is invalid`);
                    return;
                }
            }

            const eventWithPromoCodeApplied = await eventsClientPublic.findByID(
                eventId,
                promoCode
            );

            setEvent(eventWithPromoCodeApplied.data);

            if (promoCode) {
                form.setFieldValue("promo_code", promoCode);
            } else {
                form.setFieldValue("promo_code", null);
                setShowPromoCodeInput(false)
                removeQueryStringFromUrl('promo_code');
            }
        },
    });

    const productCategories = event?.product_categories || [];
    const productAreAvailable = productCategories && productCategories.some(category => !!category?.products?.length);
    const products: Product[] = productCategories.reduce((acc: Product[], category) => acc.concat(category.products ?? []), []);

    const selectedProductQuantitySum = useMemo(() => {
        let total = 0;
        form.values.products?.forEach(({ quantities }) => {
            quantities?.forEach(({ quantity }) => {
                total += Number(quantity);
            });
        });

        return total;
    }, [form.values.products]);

    useEffect(() => {
        if (form.values.promo_code) {
            const promo_code = form.values.promo_code;
            showSuccess(t`Promo ${promo_code} code applied`);
            addQueryStringToUrl('promo_code', promo_code);
        }
    }, [form.values.promo_code])

    useEffect(() => {
        if (typeof props.promoCodeValid !== 'undefined') {
            if (!props.promoCodeValid) {
                showError(t`That promo code is invalid`);
                removeQueryStringFromUrl('promo_code');
            }
        }
    }, [props.promoCodeValid])

    const populateFormValue = () => {
        const productValues: Array<ProductFormValue> = [];
        products?.forEach(product => {
            const quantitiesValues: Array<ProductPriceQuantityFormValue> = [];

            const existingProduct = form.values.products?.find(p => p.product_id === product.id);

            product.prices?.forEach(priceQuantity => {
                const existingQuantity = existingProduct?.quantities?.find(q => q.price_id === priceQuantity.id)?.quantity || 0;

                quantitiesValues.push({
                    quantity: existingQuantity,
                    price_id: Number(priceQuantity.id),
                    price: product.type === 'DONATION' ? Number(priceQuantity.price) : undefined,
                });
            });

            if (quantitiesValues.length === 0) {
                quantitiesValues.push({
                    quantity: 0,
                    price_id: 0,
                    price: 0,
                });
            }

            productValues.push({
                product_id: Number(product.id),
                quantities: quantitiesValues,
            });
        });

        if (JSON.stringify(form.values.products) !== JSON.stringify(productValues)) {
            form.setFieldValue("products", productValues);
        }
    };

    useEffect(populateFormValue, [productCategories]);

    const handleProductSelection = (values: Omit<ProductFormPayload, "session_identifier">) => {
        if (values && selectedProductQuantitySum > 0) {
            productMutation.mutate({
                ...values,
                session_identifier: getSessionIdentifier()
            });
        } else {
            showInfo(t`Please select at least one product`);
        }
    };

    const handleApplyPromoCode = () => {
        const promoCode = promoRef.current?.value;
        if (promoCode && promoCode.length >= 3) {
            promoCodeEventRefetchMutation.mutate(promoCode);
        } else {
            showError(t`Sorry, this promo code is not recognized`);
        }
    }

    const isButtonDisabled = productMutation.isPending
        || !productAreAvailable
        || selectedProductQuantitySum === 0
        || props.widgetMode === 'preview'
        || products?.every(product => product.is_sold_out);

    let productIndex = 0;

    return (
        <div className={'hi-product-widget-container'}
            ref={resizeRef}
            style={{
                '--widget-background-color': props.colors?.background,
                '--widget-primary-color': props.colors?.primary,
                '--widget-primary-text-color': props.colors?.primaryText,
                '--widget-secondary-color': props.colors?.secondary,
                '--widget-secondary-text-color': props.colors?.secondaryText,
                '--widget-padding': props?.padding,
            } as React.CSSProperties}>
            {!productAreAvailable && (
                <div className={classNames(['hi-no-products'])}>
                    <p className={classNames(['hi-no-products-message'])}>
                        {t`There are no products available for this event`}
                    </p>
                </div>
            )}
            {orderInProcessOverlayVisible && (
                <Modal
                    withCloseButton={false}
                    opened={true}
                    onClose={() => setOrderInProcessOverlayVisible(false)}
                    styles={{
                        body: {
                            padding: '30px 24px'
                        },
                        content: {
                            borderRadius: '8px',
                            backgroundColor: props.colors?.background || 'white'
                        }
                    }}
                >
                    <div style={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        color: props.colors?.primaryText || 'inherit'
                    }}>
                        <div style={{ width: '100%' }}>
                            <h3 style={{
                                margin: '0 0 12px 0',
                                fontSize: '20px',
                                fontWeight: '600',
                                color: props.colors?.primaryText || 'inherit'
                            }}>
                                {t`Please continue in the new tab`}
                            </h3>

                            <p style={{
                                margin: '0 0 20px 0',
                                fontSize: '15px',
                                lineHeight: '1.5',
                                color: props.colors?.primaryText || 'inherit'
                            }}>
                                {t`If a new tab did not open automatically, please click the button below to continue to checkout.`}
                            </p>

                            <Button
                                component="a"
                                href={'/checkout/' + eventId + '/' + productMutation.data?.data.short_id + '/details' + '?session_identifier=' + productMutation.data?.data.session_identifier}
                                target={'_blank'}
                                rel={'noopener noreferrer'}
                                fullWidth
                                size="md"
                                styles={{
                                    root: {
                                        backgroundColor: props.colors?.secondary || '#228be6',
                                        color: props.colors?.secondaryText || 'white',
                                        fontWeight: 600,
                                        marginBottom: '12px',
                                        '&:hover': {
                                            backgroundColor: props.colors?.secondary || '#1c7ed6',
                                        }
                                    }
                                }}
                            >
                                {t`Continue to Checkout`}
                            </Button>

                            <Button
                                onClick={() => setOrderInProcessOverlayVisible(false)}
                                variant={'subtle'}
                                size={'sm'}
                                styles={{
                                    root: {
                                        color: props.colors?.primaryText || '#228be6',
                                        '&:hover': {
                                            backgroundColor: 'transparent',
                                            textDecoration: 'underline'
                                        }
                                    }
                                }}
                            >
                                {t`Dismiss this message`}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
            {(event && productAreAvailable) && (
                <form target={'__blank'} onSubmit={form.onSubmit(handleProductSelection as any)}>
                    <Input type={'hidden'} {...form.getInputProps('promo_code')} />
                    <Input type={'hidden'} {...form.getInputProps('affiliate_code')} />
                    <div className={'hi-product-category-rows'}>
                        {productCategories && productCategories.map((category) => {
                            return (
                                <div className={'hi-product-category-row'} key={category.id}>
                                    <h2 className={'hi-product-category-title'} style={category.description ? {
                                        marginBottom: '0px'
                                    } : {}}>
                                        {category.name}
                                    </h2>
                                    {category.description && (
                                        <div className={'hi-product-category-description'}>
                                            <Spoiler maxHeight={500} showLabel={t`Show more`} hideLabel={t`Hide`}>
                                                <div dangerouslySetInnerHTML={{ __html: category.description }} />
                                            </Spoiler>
                                        </div>
                                    )}
                                    <div className={'hi-product-rows'}>
                                        {category.products?.length === 0 && (
                                            <div className={'hi-no-products'}>
                                                <p className={'hi-no-products-message'}>
                                                    {category.no_products_message || t`There are no products available in this category`}
                                                </p>
                                            </div>
                                        )}

                                        {(category.products) && category.products.map((product) => {
                                            const quantityRange = range(product.min_per_order || 1, product.max_per_order || 25)
                                                .map((n) => n.toString());
                                            quantityRange.unshift("0");

                                            const isProductCollapsed = collapsedProducts[Number(product.id)] ?? product.start_collapsed;
                                            const toggleCollapse = () => {
                                                setCollapsedProducts(prev => ({
                                                    ...prev,
                                                    [Number(product.id)]: !isProductCollapsed
                                                }));
                                            };

                                            return (
                                                <div key={product.id} className={'hi-product-row'}>
                                                    <div className={'hi-title-row'}>
                                                        <UnstyledButton variant={'transparent'}
                                                            className={'hi-product-title'}
                                                            onClick={toggleCollapse}
                                                        >
                                                            <h3>
                                                                {product.title}
                                                            </h3>
                                                            <div className={'hi-product-title-metadata'}>
                                                                {(product.is_available && !!product.quantity_available) && (
                                                                    <>
                                                                        {product.quantity_available === Constants.INFINITE_TICKETS && (
                                                                            <Trans>
                                                                                Unlimited available
                                                                            </Trans>
                                                                        )}
                                                                        {product.quantity_available !== Constants.INFINITE_TICKETS && (
                                                                            <Trans>
                                                                                {product.quantity_available} available
                                                                            </Trans>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {(!product.is_available && product.type === 'TIERED') && (
                                                                    <ProductAvailabilityMessage product={product}
                                                                        event={event} />
                                                                )}

                                                                <span className={`hi-product-collapse-arrow`}>
                                                                    <IconChevronRight
                                                                        className={isProductCollapsed ? "" : "open"} />
                                                                </span>
                                                            </div>
                                                        </UnstyledButton>
                                                    </div>
                                                    <Collapse transitionDuration={100} in={!isProductCollapsed}
                                                        className={'hi-product-content'}>
                                                        <div className={'hi-price-tiers-rows'}>
                                                            <TieredPricing
                                                                productIndex={productIndex++}
                                                                event={event}
                                                                product={product}
                                                                form={form}
                                                            />
                                                        </div>

                                                        {product.max_per_order && form.values.products && isObjectEmpty(form.errors) && (form.values.products[productIndex]?.quantities.reduce((acc, { quantity }) => acc + Number(quantity), 0) > product.max_per_order) && (
                                                            <div className={'hi-product-quantity-error'}>
                                                                <Trans>The maximum number of products
                                                                    for {product.title}
                                                                    is {product.max_per_order}</Trans>
                                                            </div>
                                                        )}

                                                        {form.errors[`products.${productIndex}`] && (
                                                            <div className={'hi-product-quantity-error'}>
                                                                {form.errors[`products.${productIndex}`]}
                                                            </div>
                                                        )}

                                                        {product.description && (
                                                            <div
                                                                className={'hi-product-description-row'}>
                                                                <Spoiler maxHeight={87} showLabel={t`Show more`}
                                                                    hideLabel={t`Hide`}>
                                                                    <div dangerouslySetInnerHTML={{
                                                                        __html: product.description
                                                                    }} />
                                                                </Spoiler>
                                                            </div>
                                                        )}
                                                    </Collapse>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className={'hi-footer-row'}>
                        {event?.settings?.product_page_message && (
                            <div dangerouslySetInnerHTML={{
                                __html: event.settings.product_page_message.replace(/\n/g, '<br/>')
                            }} className={'hi-product-page-message'} />
                        )}
                        <Button disabled={isButtonDisabled} fullWidth className={'hi-continue-button'}
                            type={"submit"}
                            loading={productMutation.isPending}>
                            {props.continueButtonText || event?.settings?.continue_button_text || t`Continue`}
                        </Button>
                    </div>
                </form>
            )}
            <div className={'hi-promo-code-row'}>
                {form.values.promo_code && (
                    <div className={'hi-promo-code-applied'}>
                        <span><b>{form.values.promo_code}</b> {t`applied`}</span>
                        <ActionIcon
                            className={'hi-promo-code-applied-remove-icon-button'}
                            variant="transparent"
                            aria-label={t`remove`}
                            title={t`Remove`}
                            onClick={() => {
                                promoCodeEventRefetchMutation.mutate(null)
                            }}
                        >
                            <IconX stroke={1.5} size={20} />
                        </ActionIcon>
                    </div>
                )}

                {(showPromoCodeInput && !form.values.promo_code) && (
                    <Group className={'hi-promo-code-input-wrapper'} wrap={'nowrap'} gap={'20px'}>
                        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                        {/*@ts-ignore*/}
                        <TextInput autoFocus classNames={{ input: 'hi-promo-code-input' }} onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                handleApplyPromoCode();
                            }
                        }} mb={0} ref={promoRef} />
                        <Button disabled={promoCodeEventRefetchMutation.isPending}
                            className={'hi-apply-promo-code-button'} variant={'outline'}
                            onClick={handleApplyPromoCode}>
                            {t`Apply Promo Code`}
                        </Button>
                        <ActionIcon
                            className={'hi-close-promo-code-input-button'}
                            variant="transparent"
                            aria-label={t`close`}
                            title={t`Close`}
                            onClick={() => setShowPromoCodeInput(false)}
                        >
                            <IconX stroke={1.5} size={20} />
                        </ActionIcon>
                    </Group>
                )}
            </div>
            <div class="terms">
                <p>
                    Welcome to <strong>summit.skoch.in</strong>. Skoch Consultancy Services Pvt Ltd (“SKOCH”) provides this site to you subject to the following conditions. By visiting the summit.skoch.in site (the “Site”), you accept these conditions. Please read them carefully. In addition, when you use any current or future SKOCH service or business, you also will be subject to the guidelines, terms and agreements applicable to such service or business.
                </p>
                <p>
                    These ‘Conditions of Use’ constitute an electronic record within the meaning of the applicable law. This electronic record is generated by a computer system and does not require any physical or digital signatures.
                </p>

                <h2 id="privacy">Privacy</h2>
                <p>
                    The Webinar Site is hosted and operated by SKOCH. Please review the applicable Privacy Policy, which also governs your visit to this Site, to understand practices related to your information provided through this Site.
                </p>

                <h2 id="electronic-communications">Electronic Communications</h2>
                <p>
                    When you visit the Site or send e-mails to us, you are communicating with us electronically. You consent to receive communications from us electronically. We will communicate with you by e-mail or by posting notices on this Site or through any other means available under applicable law. You agree that all agreements, notices, disclosures and other communications that we provide to you electronically satisfy any legal requirement that such communications be in writing.
                </p>

                <h2 id="copyright">Copyright</h2>
                <p>
                    All content included on this Site, such as text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, is the property of SKOCH or its affiliates or its content suppliers and protected by India and international copyright laws. The compilation of all content on this Site is the exclusive property of SKOCH or its affiliates and protected by India and international copyright laws.
                </p>

                <h2 id="trademarks">Trademarks</h2>
                <p>
                    SKOCH, the SKOCH logo, Event / Summit Logo &amp; Name, and other marks indicated on our Site are intellectual property of SKOCH or its affiliates in India. Other SKOCH graphics, logos, page headers, button icons, scripts, and service names are trademarks or trade dress of SKOCH or its affiliates. SKOCH and its affiliates’ trademarks and trade dress may not be used in connection with any product or service that is not SKOCH or its affiliates’ as applicable, in any manner that is likely to cause confusion among users, or in any manner that disparages or discredits SKOCH or its affiliates. All other trademarks not owned by SKOCH or its affiliates that appear on this Site are the property of their respective owners, who may or may not be affiliated with, connected to, or sponsored by SKOCH or its affiliates.
                </p>

                <h2 id="license">License and Site Access</h2>
                <p>
                    SKOCH grants you a limited license to access and make personal use of this Site and not to download (other than page caching) or modify it, or any portion of it, except with express written consent of SKOCH and / or its affiliates, as may be applicable. This license does not include any resale or commercial use of this Site or its contents; any derivative use of this Site or its contents; or any use of data mining, robots, or similar data gathering and extraction tools.
                </p>
                <p>
                    This Site or any portion of this Site (including but not limited to any copyrighted material, trademarks, or other proprietary information) may not be reproduced, duplicated, copied, sold, resold, visited, or otherwise exploited for any commercial purpose without express written consent of SKOCH and / or its affiliates, as may be applicable. You may not frame or utilize framing techniques to enclose any trademark, logo, or other proprietary information (including images, text, page layout, or form) of SKOCH or its affiliates without their express written consent. You may not use any meta tags or any other “hidden text” utilizing SKOCH's or its affiliates name or trademarks without their express written consent. Any unauthorized use terminates the permission or license granted by SKOCH and / or its affiliates.
                </p>
                <p>
                    You are granted a limited, non-assignable, revocable, and non-exclusive right to create a hyperlink to the home page of this Site so long as the link does not portray SKOCH, its affiliates, or their products or services in a false, misleading, derogatory, or otherwise offensive matter. You may not use any logo or other proprietary graphic or trademark of SKOCH or its affiliates as part of the link without their express written permission. In case the event organised on our platform is sponsored the participants data may be shared with the sponsor(s).
                </p>

                <h2 id="activity">Your Activity on the Site</h2>
                <p>
                    This Site is not intended for use by children. If you are a minor i.e. under the age of 18 years, you may use the Site only with involvement of a parent or guardian. SKOCH and its affiliates reserve the right to refuse service, terminate accounts, or remove or edit content in their sole discretion.
                </p>
                <p>
                    You must not use the Site in any way that causes, or is likely to cause, the Site or access to it to be interrupted, damaged or impaired in any way.
                </p>
                <p>
                    You understand that you, and not SKOCH, are responsible for all electronic communications and content sent from your computer to us and you must use the Site for lawful purposes only and only in accordance with the applicable law.
                </p>
                <p><strong>You must not use the Site for any of the following:</strong></p>
                <ul>
                    <li>for fraudulent purposes, or in connection with a criminal offence or other unlawful activity;</li>
                    <li>to send, use or reuse any material that is illegal, offensive (including but not limited to material that is sexually explicit or which promotes racism, bigotry, hatred or physical harm), abusive, harassing, misleading, indecent, defamatory, disparaging, obscene or menacing;</li>
                    <li>in breach of copyright, trademark, confidentiality, privacy or any other proprietary information or right; or which is otherwise injurious to third parties; or objectionable or otherwise unlawful in any manner whatsoever;</li>
                    <li>which consists of or contains software viruses, political campaigning, commercial solicitation, chain letters, mass mailings or any “spam”;</li>
                    <li>to cause annoyance, inconvenience or needless anxiety.</li>
                </ul>

                <h2 id="user-license">Your License</h2>
                <p>
                    If you submit material, and unless we indicate otherwise, you grant SKOCH and its affiliates a nonexclusive, royalty-free, irrevocable, perpetual and fully sublicensable right to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such content throughout the world in any media for as long as you are permitted to grant the said licence under applicable law. You grant SKOCH and its affiliates and sublicensees the right to use the name that you submit in connection with such content, if they choose.
                </p>
                <p>
                    You represent and warrant that you own or otherwise control all of the rights to the content or material that you post or submit or that you otherwise provide on or through the Site; that the content is accurate; that the content is lawful; that use of the content you supply does not violate this policy and will not cause injury to any person or entity; and that you will indemnify SKOCH and its affiliates for all claims arising from content you supply. SKOCH has the right but not the obligation to monitor and edit or remove any activity or content. SKOCH takes no responsibility and assumes no liability for any content submitted by you or any third party.
                </p>

                <h2 id="copyright-complaints">Copyright Complaints</h2>
                <p>
                    SKOCH and its affiliates respect the intellectual property of others. If you believe that your work has been copied in a way that constitutes infringement of your intellectual property, please follow our Trademark and Copyright policy below.
                </p>

                <h2 id="services-description">Services Description</h2>
                <p>
                    SKOCH and its affiliates attempt to be as accurate as possible. However, SKOCH does not warrant that descriptions of or other content of this Site is accurate, complete, reliable, current, or error-free. Also, your access to the Site may also be occasionally suspended or restricted to allow for repairs, maintenance, or the introduction of new facilities or at any time without prior notice. We will attempt to limit the frequency and duration of any such suspension or restriction.
                </p>
                <p>
                    SKOCH provides links to other Sites over which SKOCH has no control. SKOCH is not responsible for the availability of such external sites or resources and does not endorse and is not responsible or liable for any content, advertising, products or other material on or available from such sites or resources.
                </p>

                <h2 id="disclaimer">Disclaimer of Warranties and Limitation of Liabilities</h2>
                <p>
                    This Site is provided by SKOCH on an “as is” and “as available” basis. SKOCH makes no representations or warranties of any kind, express or implied, as to the operation of this Site or the information, content, materials, or products included on this Site. You expressly agree that your use of this Site is at your sole risk. SKOCH reserves the right to withdraw or delete any information from this Site at any time in its discretion.
                </p>
                <p>
                    To the full extent permissible by applicable law, SKOCH disclaims all warranties, express or implied, including, but not limited to, implied warranties of merchantability and fitness for a particular purpose. SKOCH does not warrant that this Site, its servers, or e-mail sent from SKOCH are free of viruses or other harmful components. SKOCH will not be liable for any damages of any kind arising from the use of this Site, including, but not limited to direct, indirect, incidental, punitive and consequential damages.
                </p>

                <h2 id="applicable-law">Applicable Law</h2>
                <p>
                    By visiting this Site, you agree that the laws of India will govern these Terms of Use and any dispute of any sort that might arise between you and SKOCH or its affiliates.
                </p>

                <h2 id="disputes">Disputes</h2>
                <p>
                    Any dispute relating in any way to your visit to this Site shall be submitted to the exclusive jurisdiction of the courts at Delhi, India.
                </p>

                <h2 id="modification">Site Policies, Modification and Severability</h2>
                <p>
                    We reserve the right to make changes to our Site, policies, and these Terms of Use at any time. If any of these conditions shall be deemed invalid, void, or for any reason unenforceable, that condition shall be deemed severable and shall not affect the validity and enforceability of any remaining condition.
                </p>

                <h2 id="address">Our Address</h2>
                <p>
                    This Site is owned by Skoch Consultancy Services Pvt Ltd, A-222, Sushant Lok, Phase I, Gurgaon – 122001
                </p>
            </div>


            {
                /**
                 * (c) Hi.Events Ltd 2025
                 *
                 * PLEASE NOTE:
                 *
                 * Hi.Events is licensed under the GNU Affero General Public License (AGPL) version 3.
                 *
                 * You can find the full license text at: https://github.com/HiEventsDev/hi.events/blob/main/LICENCE
                 *
                 * In accordance with Section 7(b) of the AGPL, we ask that you retain the "Powered by Hi.Events" notice.
                 *
                 * If you wish to remove this notice, a commercial license is available at: https://hi.events/licensing
                 */
            }
            {(props.showPoweredBy ?? true) && (
                <PoweredByFooter style={{
                    'color': props.colors?.primaryText || '#000',
                }} />
            )}
        </div>
    );
}

export default SelectProducts;
