module.exports = searchByCpf = (cpf, appointmentFromPiripiri, appointmentFromPedroII) => {
    fromPiripiri = appointmentFromPiripiri.find(element => element.cpf === cpf);
    fromPedroII = appointmentFromPedroII.find(element => element.cpf === cpf);

    fromPiripiri = fromPiripiri === undefined ? [] : fromPiripiri;
    fromPedroII = fromPedroII === undefined ? undefined : fromPedroII;

    return [fromPiripiri, fromPedroII];
}