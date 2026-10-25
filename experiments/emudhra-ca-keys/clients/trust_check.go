package main

import (
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
)

func load(path string) *x509.Certificate {
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Println("read error:", err)
		os.Exit(1)
	}
	block, _ := pem.Decode(data)
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		fmt.Println("parse error:", err)
		os.Exit(1)
	}
	return cert
}

func main() {
	pool, err := x509.SystemCertPool()
	if err != nil {
		fmt.Println("go systempool error:", err)
		os.Exit(1)
	}
	leaf := load(os.Args[1])
	intermediates := x509.NewCertPool()
	bridge, err := os.ReadFile(os.Args[2])
	if err != nil {
		fmt.Println("read error:", err)
		os.Exit(1)
	}
	intermediates.AppendCertsFromPEM(bridge)
	_, err = leaf.Verify(x509.VerifyOptions{
		Roots:         pool,
		Intermediates: intermediates,
		KeyUsages:     []x509.ExtKeyUsage{x509.ExtKeyUsageAny},
	})
	if err != nil {
		fmt.Println("go reject:", err)
	} else {
		fmt.Println("go accept: the system roots trust the chain to the anchor")
	}
}
