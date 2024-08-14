import { getGatewayEncryptionKey, queryGatewayAuth } from './gateway';
import { getConsumerClient, getConsumerWallet } from './clients';
import { getArb36Credential } from './crypto';
import { gatewayChachaHookMemo, gatewayHookMemo, sendIBCToken } from './ibc';
import { loadContractConfig, loadIbcConfig } from './config';
import dotenv from 'dotenv';
dotenv.config();

let CONSUMER_TOKEN = process.env.CONSUMER_TOKEN;

const interactWithGatewayContract = async () => {
    const gatewayKey = await getGatewayEncryptionKey();

    const signingWallet = await getConsumerWallet();
    const signingClient = await getConsumerClient(signingWallet);
    const signerAddress = (await signingWallet.getAccounts())[0].address;
    const consumerQCFirst = await getArb36Credential(signingWallet!, "foo")
    const consumerQCSecond = await getArb36Credential(signingWallet!, "bar")

    const ibcConfig = loadIbcConfig();
    const secretGateway = loadContractConfig().gateway!;

    const new_text = "new_text_" + Math.random().toString(36).substring(7);

    const responseSimple = await sendIBCToken(
        signingClient,
        signerAddress,
        secretGateway.address,
        CONSUMER_TOKEN!,
        "1",
        ibcConfig.consumer_channel_id,
        gatewayHookMemo(
            { extension: { msg: { store_secret: { text: new_text } } }},
            secretGateway
        )
    )

    console.log("Simple IBC Hook Response:", responseSimple);

    const non_updated_text = (await queryGatewayAuth(
        { get_secret: {} },
        [consumerQCFirst]
    )) as string;
    
    console.log("Non-Updated Text:", non_updated_text);

    // Send an authenticated & encrypted message
    const new_new_text = "new_text_" + Math.random().toString(36).substring(7);

            const responseEncrypted = await sendIBCToken(
                signingClient,
                signerAddress,
                secretGateway.address,
                CONSUMER_TOKEN!,
                "1",
                ibcConfig.consumer_channel_id,
                await gatewayChachaHookMemo(
                    signingWallet!,
                    { extension: { msg: { store_secret: { text: new_new_text } } } },
                    secretGateway,
                    gatewayKey
                )
    );

    console.log("Encrypted IBC Hook Response:", responseEncrypted);

    const updated_text = (await queryGatewayAuth(
        { get_secret: {} },
        [consumerQCSecond]
    )) as string;
    
    console.log("Updated Text:", updated_text);
};

interactWithGatewayContract().catch(error => {
    console.error("Error interacting with gateway contract:", error);
});